/**
 * AWS Rekognition: IndexFaces (enroll), DetectFaces, SearchFacesByImage (match).
 * Collection já existe: kingselection (us-east-1).
 */
const {
  RekognitionClient,
  IndexFacesCommand,
  DetectFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand
} = require('@aws-sdk/client-rekognition');

function getRekogConfig() {
  const region = (process.env.AWS_REGION || 'us-east-1').toString().trim();
  const collectionId = (process.env.REKOG_COLLECTION_ID || 'kingselection').toString().trim();
  const faceMatchThreshold = Math.min(100, Math.max(0, parseInt(process.env.REKOG_FACE_MATCH_THRESHOLD || '85', 10)));
  const maxFacesPerImage = Math.min(50, Math.max(1, parseInt(process.env.REKOG_MAX_FACES_PER_IMAGE || '10', 10)));
  const enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  return { enabled, region, collectionId, faceMatchThreshold, maxFacesPerImage };
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
    }
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
 * Busca na collection por imagem (bytes do recorte do rosto). Para match.
 * @param {Buffer} imageBytes
 * @returns {Promise<{ FaceMatches: Array<{ Face: { FaceId }, Similarity }, FaceModelVersion }>}
 */
async function searchFacesByImageBytes(imageBytes) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');
  const cmd = new SearchFacesByImageCommand({
    CollectionId: cfg.collectionId,
    Image: { Bytes: imageBytes },
    FaceMatchThreshold: cfg.faceMatchThreshold,
    MaxFaces: 10
  });
  const out = await client.send(cmd);
  return out;
}

/**
 * Busca na collection por imagem no S3 (objeto inteiro). Alternativa quando a imagem já está no staging.
 */
async function searchFacesByImageS3(bucket, name) {
  const client = getRekogClient();
  const cfg = getRekogConfig();
  if (!client || !cfg.enabled) throw new Error('Rekognition não configurado');
  const cmd = new SearchFacesByImageCommand({
    CollectionId: cfg.collectionId,
    Image: { S3Object: { Bucket: bucket, Name: name } },
    FaceMatchThreshold: cfg.faceMatchThreshold,
    MaxFaces: cfg.maxFacesPerImage
  });
  const out = await client.send(cmd);
  return out;
}

module.exports = {
  getRekogConfig,
  indexFacesFromS3,
  detectFacesFromS3,
  searchFacesByImageBytes,
  searchFacesByImageS3
};
