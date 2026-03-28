/**
 * AWS Rekognition: IndexFaces (enroll), DetectFaces, SearchFacesByImage (match), CompareFaces (busca sob demanda).
 * Collection já existe: kingselection (us-east-1).
 */
const {
  RekognitionClient,
  IndexFacesCommand,
  DetectFacesCommand,
  SearchFacesByImageCommand,
  CompareFacesCommand,
  DeleteFacesCommand,
  CreateCollectionCommand
} = require('@aws-sdk/client-rekognition');

function getRekogConfig() {
  const region = (process.env.AWS_REGION || 'us-east-1').toString().trim();
  const collectionId = (process.env.REKOG_COLLECTION_ID || 'kingselection').toString().trim();
  const faceMatchThreshold = Math.min(100, Math.max(0, parseInt(process.env.REKOG_FACE_MATCH_THRESHOLD || '85', 10)));
  /** CompareFaces (galeria sob demanda): padrão 72 para melhorar recall em eventos com luz/ângulo difíceis. */
  const compareSimilarityThreshold = Math.min(
    100,
    Math.max(50, parseInt(process.env.REKOG_COMPARE_SIMILARITY_THRESHOLD || '72', 10) || 72)
  );
  /**
   * SearchFacesByImage (recorte da foto do evento vs collection): por defeito o mínimo entre faceMatch e compare,
   * para alinhar com fotos de evento (antes 85 só aqui perdia matches que CompareFaces já aceitava).
   */
  const searchFaceMatchThreshold = Math.min(
    100,
    Math.max(
      50,
      (() => {
        const e = process.env.REKOG_SEARCH_FACE_MATCH_THRESHOLD;
        if (e != null && String(e).trim() !== '') {
          const n = parseInt(String(e), 10);
          return Number.isFinite(n) ? n : Math.min(faceMatchThreshold, compareSimilarityThreshold);
        }
        return Math.min(faceMatchThreshold, compareSimilarityThreshold);
      })()
    )
  );
  const maxFacesPerImage = Math.min(50, Math.max(1, parseInt(process.env.REKOG_MAX_FACES_PER_IMAGE || '10', 10)));
  const enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  return {
    enabled,
    region,
    collectionId,
    faceMatchThreshold,
    compareSimilarityThreshold,
    searchFaceMatchThreshold,
    maxFacesPerImage
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableRekogError(err) {
  const name = err?.name || err?.Code || '';
  return (
    name === 'ThrottlingException' ||
    name === 'ProvisionedThroughputExceededException' ||
    name === 'ServiceUnavailableException' ||
    name === 'InternalServerError' ||
    String(err?.message || '').toLowerCase().includes('throttl')
  );
}

let _client = null;
function getRekogClient() {
  const cfg = getRekogConfig();
  if (!cfg.enabled) return null;
  if (_client) return _client;
  _client = new RekognitionClient({
    region: cfg.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    maxAttempts: Math.min(8, Math.max(3, parseInt(String(process.env.REKOG_MAX_ATTEMPTS || '5'), 10) || 5))
  });
  return _client;
}

/**
 * Indexa rosto na collection (enroll). Imagem deve estar no S3 staging.
 * @param {string} bucket - S3_STAGING_BUCKET
 * @param {string} name - key do objeto no S3 (ex: staging/123/abc.jpg)
 * @param {string} externalImageId - id do cliente (ex: g123_c456 ou cliente1)
 * @returns {Promise<{ faceRecords: Array<{ Face: { FaceId }, FaceDetail }> }>}
 */
async function indexFacesFromS3(bucket, name, externalImageId) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');

  const cmd = new IndexFacesCommand({
    CollectionId: cfg.collectionId,
    Image: { S3Object: { Bucket: bucket, Name: name } },
    ExternalImageId: String(externalImageId).slice(0, 255),
    MaxFaces: 5,
    QualityFilter: 'AUTO'
  });

  try {
    return await client.send(cmd);
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      console.log(`[Rekognition] Coleção ${cfg.collectionId} não encontrada. Criando...`);
      try {
        await client.send(new CreateCollectionCommand({ CollectionId: cfg.collectionId }));
        console.log(`[Rekognition] Coleção ${cfg.collectionId} criada. Tentando indexar novamente...`);
        return await client.send(cmd);
      } catch (createErr) {
        console.error(`[Rekognition] Erro ao criar coleção: ${createErr.message}`);
        throw err; // lança o erro original
      }
    }
    throw err;
  }
}

/**
 * Detecta rostos na imagem (S3 staging). Retorna bounding boxes e confidence.
 * @param {string} bucket
 * @param {string} name
 */
async function detectFacesFromS3(bucket, name) {
  const client = getRekogClient();
  if (!client) throw new Error('Rekognition não configurado');
  const cmd = new DetectFacesCommand({
    Image: { S3Object: { Bucket: bucket, Name: name } },
    Attributes: ['DEFAULT']
  });
  const out = await client.send(cmd);
  return out;
}

/**
 * Detecta rostos em imagem em memória (selfie / referência antes de CompareFaces).
 */
async function detectFacesFromBytes(imageBytes) {
  const client = getRekogClient();
  if (!client) throw new Error('Rekognition não configurado');
  const cmd = new DetectFacesCommand({
    Image: { Bytes: imageBytes },
    Attributes: ['DEFAULT']
  });
  return client.send(cmd);
}

/**
 * Busca na collection por imagem (bytes do recorte do rosto). Para match.
 * @param {Buffer} imageBytes
 * @returns {Promise<{ FaceMatches: Array<{ Face: { FaceId }, Similarity }, FaceModelVersion }>}
 */
async function searchFacesByImageBytes(imageBytes) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');
  const maxAttempts = Math.min(6, Math.max(2, parseInt(String(process.env.REKOG_SEARCH_MAX_ATTEMPTS || '4'), 10) || 4));
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const cmd = new SearchFacesByImageCommand({
        CollectionId: cfg.collectionId,
        Image: { Bytes: imageBytes },
        FaceMatchThreshold: cfg.searchFaceMatchThreshold ?? cfg.faceMatchThreshold,
        MaxFaces: 10
      });
      return await client.send(cmd);
    } catch (err) {
      lastErr = err;
      if (!isRetryableRekogError(err) || attempt >= maxAttempts - 1) throw err;
      const backoff = 260 * Math.pow(2, attempt) + Math.floor(Math.random() * 180);
      await sleep(backoff);
    }
  }
  throw lastErr || new Error('SearchFacesByImage (bytes) falhou');
}

/**
 * Busca na collection por imagem no S3 (objeto inteiro). Alternativa quando a imagem já está no staging.
 */
async function searchFacesByImageS3(bucket, name) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');
  const maxAttempts = Math.min(6, Math.max(2, parseInt(String(process.env.REKOG_SEARCH_MAX_ATTEMPTS || '4'), 10) || 4));
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const cmd = new SearchFacesByImageCommand({
        CollectionId: cfg.collectionId,
        Image: { S3Object: { Bucket: bucket, Name: name } },
        FaceMatchThreshold: cfg.searchFaceMatchThreshold ?? cfg.faceMatchThreshold,
        MaxFaces: cfg.maxFacesPerImage
      });
      return await client.send(cmd);
    } catch (err) {
      lastErr = err;
      if (!isRetryableRekogError(err) || attempt >= maxAttempts - 1) throw err;
      const backoff = 260 * Math.pow(2, attempt) + Math.floor(Math.random() * 180);
      await sleep(backoff);
    }
  }
  throw lastErr || new Error('SearchFacesByImage (s3) falhou');
}

/**
 * Compara rosto na imagem fonte com rostos na imagem alvo (sem usar collection).
 * Usado no modo sob demanda: cobra só quando o cliente envia a foto; resultado é cacheado.
 * @param {Buffer} sourceImageBytes - foto do cliente (rosto a buscar)
 * @param {Buffer} targetImageBytes - foto da galeria
 * @returns {Promise<{ FaceMatches: Array<{ Similarity }> }>}
 */
async function compareFaces(sourceImageBytes, targetImageBytes) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');
  const threshold = cfg.compareSimilarityThreshold ?? cfg.faceMatchThreshold;
  const maxAttempts = Math.min(6, Math.max(2, parseInt(String(process.env.REKOG_COMPARE_MAX_ATTEMPTS || '4'), 10) || 4));
  const cmdBase = {
    SourceImage: { Bytes: sourceImageBytes },
    TargetImage: { Bytes: targetImageBytes },
    SimilarityThreshold: threshold
  };
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const out = await client.send(new CompareFacesCommand(cmdBase));
      return out;
    } catch (err) {
      lastErr = err;
      if (!isRetryableRekogError(err) || attempt >= maxAttempts - 1) throw err;
      const backoff = 280 * Math.pow(2, attempt) + Math.floor(Math.random() * 220);
      await sleep(backoff);
    }
  }
  throw lastErr || new Error('CompareFaces falhou');
}

/**
 * Remove faceIds antigos da collection (útil ao recadastrar rosto do mesmo cliente).
 * @param {string[]} faceIds
 * @returns {Promise<{ deleted: string[], failed: string[] }>}
 */
async function deleteFacesFromCollection(faceIds) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');
  const ids = Array.from(new Set((Array.isArray(faceIds) ? faceIds : []).map((x) => String(x || '').trim()).filter(Boolean)));
  if (!ids.length) return { deleted: [], failed: [] };

  const deleted = [];
  const failed = [];
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const cmd = new DeleteFacesCommand({
      CollectionId: cfg.collectionId,
      FaceIds: chunk
    });
    try {
      const out = await client.send(cmd);
      const ok = Array.isArray(out?.DeletedFaces) ? out.DeletedFaces : [];
      deleted.push(...ok);
      const okSet = new Set(ok);
      for (const id of chunk) {
        if (!okSet.has(id)) failed.push(id);
      }
    } catch (_) {
      failed.push(...chunk);
    }
  }
  return { deleted, failed };
}

module.exports = {
  getRekogConfig,
  indexFacesFromS3,
  detectFacesFromS3,
  detectFacesFromBytes,
  searchFacesByImageBytes,
  searchFacesByImageS3,
  compareFaces,
  deleteFacesFromCollection
};
