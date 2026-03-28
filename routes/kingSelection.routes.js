const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');
const fetch = require('node-fetch');
const FormData = require('form-data');
const sharp = require('sharp');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getR2Config, r2PublicUrl, r2GetObjectBuffer, r2GetObjectViaPublicUrl, r2PresignPut, r2PutObjectBuffer, r2HeadObject } = require('../utils/r2');
const { getStagingConfig, buildStagingKey, putStagingObject, getStagingObject, deleteStagingObject } = require('../utils/rekognition/s3StagingService');
const {
  getRekogConfig,
  indexFacesFromS3,
  detectFacesFromS3,
  detectFacesFromBytes,
  searchFacesByImageBytes,
  compareFaces,
  deleteFacesFromCollection
} = require('../utils/rekognition/rekognitionService');
const { normalizeImageForRekognition, cropFace } = require('../utils/rekognition/imageService');
const { fetchKingSelectionOgData, buildShareMetaPayload } = require('../utils/kingSelectionOg');

const router = express.Router();
const KS_PAYMENT_PROOF_DIR = path.resolve(process.cwd(), 'uploads', 'kingselection-payment-proofs');

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const mt = String(file?.mimetype || '').toLowerCase();
    if (mt.startsWith('image/')) return cb(null, true);
    return cb(new Error('Apenas imagens são permitidas'), false);
  }
});

async function ksStorePaymentProofImage(file, galleryId, clientId, selectionBatch) {
  if (!file || !file.buffer) throw new Error('Arquivo de comprovante não enviado.');
  await fs.promises.mkdir(KS_PAYMENT_PROOF_DIR, { recursive: true });
  const safeG = parseInt(galleryId, 10) || 0;
  const safeC = parseInt(clientId, 10) || 0;
  const safeB = parseInt(selectionBatch, 10) || 1;
  const outName = `g${safeG}_c${safeC}_r${safeB}_${Date.now()}.jpg`;
  const outPath = path.join(KS_PAYMENT_PROOF_DIR, outName);
  const outBuf = await sharp(file.buffer).rotate().jpeg({ quality: 88, progressive: true }).toBuffer();
  await fs.promises.writeFile(outPath, outBuf);
  return outPath;
}

// TESTE DE VERSÃO - Para confirmar que o backend foi atualizado
router.get('/ping-version', (req, res) => res.json({ success: true, version: '2026-02-21-v3', timestamp: new Date() }));

// Debug AWS
router.get('/aws-check', protectUser, asyncHandler(async (req, res) => {
  const s3Cfg = getStagingConfig();
  const rekogCfg = getRekogConfig();
  res.json({
    s3: { enabled: s3Cfg.enabled, bucket: s3Cfg.bucket, region: s3Cfg.region },
    rekog: { enabled: rekogCfg.enabled, collectionId: rekogCfg.collectionId, region: rekogCfg.region }
  });
}));

// Ping público para teste rápido sem login
router.get('/public/aws-ping', asyncHandler(async (req, res) => {
  const s3Cfg = getStagingConfig();
  const rekogCfg = getRekogConfig();
  res.json({
    success: true,
    s3: s3Cfg.enabled,
    rekog: rekogCfg.enabled,
    bucket: s3Cfg.bucket ? '***' + s3Cfg.bucket.slice(-4) : null,
    collection: rekogCfg.collectionId
  });
}));

/** Meta Open Graph para WhatsApp/Facebook (Hostinger serve HTML estático; PHP injeta usando este JSON). */
router.get('/public/gallery-share-meta/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug || slug.length > 200) {
    return res.status(400).json({ success: false, message: 'Slug inválido.' });
  }
  const hostHdr = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  const fromQuery = String(req.query.siteHost || '').trim();
  const hostForOg = fromQuery || hostHdr.split(',')[0].trim();
  const og = await fetchKingSelectionOgData(db.pool, slug);
  const payload = buildShareMetaPayload(og, hostForOg, slug);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(payload);
}));

// Enrollment anônimo para galeria pública - MOVIDO PARA O TOPO
router.post('/public/enroll-face-anonymous', uploadMem.single('image'), asyncHandler(async (req, res) => {
  const slug = (req.query.slug || req.body.slug || '').toString().trim();
  if (!slug) return res.status(400).json({ message: 'Slug é obrigatório.' });
  if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem enviada.' });

  const stagingCfg = getStagingConfig();
  const rekogCfg = getRekogConfig();
  if (!stagingCfg.enabled || !rekogCfg.enabled) {
    return res.status(503).json({ message: 'Reconhecimento facial não configurado no servidor.' });
  }

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id, slug, access_mode FROM king_galleries WHERE slug=$1', [slug]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    // Verificar se a tabela de faces existe (obrigatório para enroll)
    try {
      await client.query('SELECT id FROM rekognition_client_faces LIMIT 1');
    } catch (tblErr) {
      console.error('[Face Enrollment] Tabela rekognition_client_faces não encontrada:', tblErr.message);
      return res.status(503).json({
        message: 'Reconhecimento facial não está disponível. Execute as migrations do banco (rekognition) no servidor.'
      });
    }

    if (g.access_mode !== 'public') return res.status(403).json({ message: 'Esta galeria não é pública. Use o login normal.' });

    const visitorId = req.query.visitorId || crypto.randomUUID();
    const guestEmail = `guest_${visitorId}@guest.com`;

    let guestRes = await client.query('SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND email=$2', [g.id, guestEmail]);
    let clientId;
    if (guestRes.rows.length === 0) {
      // senha_hash é obrigatório no banco. Como é guest, usamos um placeholder.
      const placeholderPass = crypto.randomBytes(16).toString('hex');
      const insRes = await client.query(
        `INSERT INTO king_gallery_clients (gallery_id, nome, email, senha_hash, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW()) RETURNING id`,
        [g.id, 'Visitante', guestEmail, placeholderPass]
      );
      clientId = insRes.rows[0].id;
    } else {
      clientId = guestRes.rows[0].id;
    }

    let buffer;
    try {
      buffer = await normalizeImageForRekognition(req.file.buffer);
    } catch (imgErr) {
      console.error('[Face Enrollment] normalizeImageForRekognition:', imgErr?.message || imgErr);
      return res.status(400).json({ message: 'Imagem inválida ou corrompida. Tente outra foto.' });
    }

    // Modo sob demanda: salva imagem de referência no staging (não deleta); não chama IndexFaces (evita custo)
    if (useRekogOnDemand()) {
      const refStagingKey = `staging/enroll/g${g.id}/c${clientId}.jpg`;
      try {
        await putStagingObject(refStagingKey, buffer, 'image/jpeg');
      } catch (s3Err) {
        console.error('[Face Enrollment] S3 staging putStagingObject:', s3Err?.message || s3Err);
        return res.status(503).json({
          message: 'Serviço de reconhecimento facial temporariamente indisponível. Verifique no servidor: bucket S3 staging e permissões AWS.'
        });
      }
      await deleteSearchCacheForClientSession(client, g.id, clientId);
      await client.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [g.id, clientId]);
      await clearClientFaceMatchesForGallery(client, g.id, clientId);
      await client.query(
        `INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
         VALUES ($1, $2, $3, NULL, $4)`,
        [g.id, clientId, 'on_demand_' + clientId, refStagingKey]
      );
    } else {
      const stagingKey = `staging/enroll/g${g.id}/c${clientId}_${Date.now()}.jpg`;
      try {
        await putStagingObject(stagingKey, buffer, 'image/jpeg');
      } catch (s3Err) {
        console.error('[Face Enrollment] S3 staging putStagingObject:', s3Err?.message || s3Err);
        return res.status(503).json({
          message: 'Serviço de reconhecimento facial temporariamente indisponível. Verifique no servidor: bucket S3 staging e permissões AWS.'
        });
      }

      const externalImageId = `g${g.id}_c${clientId}`;
      let indexResult;
      try {
        indexResult = await indexFacesFromS3(stagingCfg.bucket, stagingKey, externalImageId);
      } catch (rekErr) {
        console.error('[Face Enrollment] Rekognition indexFacesFromS3:', rekErr?.message || rekErr);
        await deleteStagingObject(stagingKey).catch(() => { });
        return res.status(503).json({
          message: 'Serviço de reconhecimento facial temporariamente indisponível. Verifique no servidor: AWS Rekognition e coleção.'
        });
      } finally {
        await deleteStagingObject(stagingKey).catch(() => { });
      }

      const faceRecords = indexResult.FaceRecords || [];
      if (faceRecords.length === 0) return res.status(400).json({ message: 'Rosto não detectado na imagem. Tente uma foto mais clara.' });

      await removeOldClientFacesFromCollection(client, g.id, clientId);
      await deleteSearchCacheForClientSession(client, g.id, clientId);
      await client.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [g.id, clientId]);
      await clearClientFaceMatchesForGallery(client, g.id, clientId);
      for (const rec of faceRecords) {
        const faceId = rec.Face?.FaceId;
        if (!faceId) continue;
        await client.query(
          `INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
           VALUES ($1, $2, $3, $4, $5)`,
          [g.id, clientId, faceId, rec.Face?.ImageId || null, 'anon']
        );
      }
    }

    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, clientId, slug: g.slug, tyh: false },
      config.jwt.secret,
      { expiresIn: '14d' }
    );

    res.json({ success: true, token, visitorId });
  } catch (e) {
    console.error('[Face Enrollment Error]:', e?.message || e);
    if (e?.code) console.error('[Face Enrollment] code:', e.code, 'detail:', e.detail);
    // Verificar se é erro de unicidade (já cadastrado) ou outro
    if (e.code === '23505' || (e.message && e.message.includes('unique'))) {
      return res.status(400).json({ message: 'Este e-mail já está em uso ou este rosto já foi cadastrado.' });
    }
    // Erro de restrição de NOT NULL
    if (e.code === '23502') {
      return res.status(500).json({ message: 'Erro de banco de dados: campo obrigatório ausente.' });
    }
    // Não expor detalhes internos (AWS, stack) ao cliente
    res.status(500).json({
      message: 'Erro interno ao processar reconhecimento facial. Tente outra foto ou mais tarde.'
    });
  } finally {
    client.release();
  }
}));

// ============================================================
// ===== Worker upload token (HMAC) ============================
// ============================================================
const KS_WORKER_SECRET = (process.env.KINGSELECTION_WORKER_SECRET || '').toString().trim();

function ksB64UrlJson(obj) {
  return Buffer.from(JSON.stringify(obj || {}), 'utf8').toString('base64url');
}

function ksParseB64UrlJson(str) {
  return JSON.parse(Buffer.from(String(str || ''), 'base64url').toString('utf8'));
}

function ksSignToken(payload) {
  if (!KS_WORKER_SECRET) throw new Error('KINGSELECTION_WORKER_SECRET não configurado');
  const header = { alg: 'HS256', typ: 'KS' };
  const h = ksB64UrlJson(header);
  const p = ksB64UrlJson(payload);
  const sig = crypto.createHmac('sha256', KS_WORKER_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function ksVerifyToken(token) {
  if (!KS_WORKER_SECRET) return null;
  const t = String(token || '').trim();
  const parts = t.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto.createHmac('sha256', KS_WORKER_SECRET).update(`${h}.${p}`).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch (_) {
    return null;
  }
  try {
    const payload = ksParseB64UrlJson(p);
    const now = Math.floor(Date.now() / 1000);
    if (payload && payload.exp && now >= payload.exp) return null;
    return payload || null;
  } catch (_) {
    return null;
  }
}

function normDigits(str) {
  return String(str || '').replace(/[^\d]/g, '');
}

/** Retorna width/height corretos considerando EXIF orientation (fotos verticais com rotação) */
function getDisplayDimensions(meta, fallbackW = 1200, fallbackH = 1200) {
  let w = meta.width || fallbackW;
  let h = meta.height || fallbackH;
  const ori = meta.orientation;
  if (ori >= 5 && ori <= 8) {
    [w, h] = [h, w];
  }
  return { width: w, height: h };
}

async function notifyWhatsAppSelectionFinalized({
  pgClient,
  galleryId,
  clientId,
  feedback
}) {
  // Best-effort: nunca falhar a finalização por causa de notificação
  const enabled = ['1', 'true', 'sim', 'yes', 'on'].includes(String(process.env.KINGSELECTION_NOTIFY_WHATSAPP || '').trim().toLowerCase());
  if (!enabled) return;

  // Buscar dono da galeria (para pegar whatsapp configurado em user_profiles)
  const ownerRes = await pgClient.query(
    `SELECT pi.user_id, g.nome_projeto, g.slug, g.cliente_email
     FROM king_galleries g
     JOIN profile_items pi ON pi.id = g.profile_item_id
     WHERE g.id=$1
     LIMIT 1`,
    [galleryId]
  );
  if (!ownerRes.rows.length) return;
  const owner = ownerRes.rows[0];

  // WhatsApp configurado em "Configurações" (user_profiles.whatsapp_number)
  let whatsapp = null;
  try {
    const hasWhats = await hasColumn(pgClient, 'user_profiles', 'whatsapp_number');
    if (hasWhats) {
      const wRes = await pgClient.query(
        `SELECT whatsapp_number
         FROM user_profiles
         WHERE user_id=$1
         ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST, id DESC
         LIMIT 1`,
        [owner.user_id]
      );
      whatsapp = wRes.rows?.[0]?.whatsapp_number || null;
    }
  } catch (_) { }

  // Fallback via env (se quiser forçar)
  whatsapp = whatsapp || process.env.KINGSELECTION_NOTIFY_WHATSAPP_NUMBER || null;
  if (!whatsapp) return;

  // Cliente que finalizou
  let clientName = null;
  let clientEmail = null;
  if (clientId && (await hasTable(pgClient, 'king_gallery_clients'))) {
    const cRes = await pgClient.query(
      'SELECT nome, email FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2 LIMIT 1',
      [clientId, galleryId]
    );
    clientName = cRes.rows?.[0]?.nome || null;
    clientEmail = cRes.rows?.[0]?.email || null;
  }
  clientEmail = clientEmail || owner.cliente_email || null;

  // Quantidade selecionada (por cliente se disponível)
  let selectedCount = 0;
  try {
    const hasSelClient = await hasColumn(pgClient, 'king_selections', 'client_id');
    let countRes;
    if (hasSelClient && clientId) {
      countRes = await pgClient.query('SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id=$1 AND client_id=$2', [galleryId, clientId]);
    } else if (hasSelClient) {
      countRes = await pgClient.query('SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL', [galleryId]);
    } else {
      countRes = await pgClient.query('SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id=$1', [galleryId]);
    }
    selectedCount = countRes.rows?.[0]?.c || 0;
  } catch (_) { }

  const proj = owner.nome_projeto || owner.slug || 'Galeria';
  const when = new Date().toLocaleString('pt-BR');
  const msgLines = [
    '✅ SELEÇÃO FINALIZADA (KingSelection)',
    '',
    `Projeto: ${proj}`,
    `Slug: ${owner.slug || '-'}`,
    `Cliente: ${clientName || '-'} ${clientEmail ? `(${clientEmail})` : ''}`.trim(),
    `Selecionadas: ${selectedCount}`,
    feedback && String(feedback).trim() ? `Mensagem do cliente: ${String(feedback).trim().slice(0, 600)}` : null,
    `Quando: ${when}`,
    '',
    `GalleryId: ${galleryId}`
  ].filter(Boolean);
  const text = msgLines.join('\n');

  // Provider 1: Webhook (genérico)
  const webhookUrl = (process.env.KINGSELECTION_NOTIFY_WEBHOOK_URL || '').toString().trim();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'kingselection.finalized',
          galleryId,
          slug: owner.slug,
          project: proj,
          clientId: clientId || null,
          clientEmail,
          selectedCount,
          feedback: (feedback && String(feedback).trim()) ? String(feedback).trim() : null,
          whatsapp: String(whatsapp || ''),
          message: text
        })
      });
    } catch (_) { }
  }

  // Provider 2: CallMeBot (opcional) - envia WhatsApp de verdade
  const callmebotKey = (process.env.KINGSELECTION_CALLMEBOT_APIKEY || process.env.CALLMEBOT_APIKEY || '').toString().trim();
  if (callmebotKey) {
    try {
      const phone = normDigits(whatsapp);
      if (phone) {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(callmebotKey)}`;
        await fetch(url, { method: 'GET' });
      }
    } catch (_) { }
  }
}

// Cache simples para introspecção de schema (evita queries repetidas)
const _schemaCache = {
  columns: new Map(),
  tables: new Map()
};

async function hasColumn(pgClient, tableName, columnName) {
  const key = `${tableName}.${columnName}`;
  if (_schemaCache.columns.has(key)) return _schemaCache.columns.get(key);
  const res = await pgClient.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  const ok = res.rows.length > 0;
  _schemaCache.columns.set(key, ok);
  return ok;
}

async function hasTable(pgClient, tableName) {
  const key = `table:${tableName}`;
  if (_schemaCache.tables.has(key)) return _schemaCache.tables.get(key);
  const res = await pgClient.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema='public' AND table_name=$1
     LIMIT 1`,
    [tableName]
  );
  const ok = res.rows.length > 0;
  _schemaCache.tables.set(key, ok);
  return ok;
}

/** Evita cache “falso” se o servidor subiu antes da migration da coluna. */
function invalidateSchemaColumnCache(tableName, columnName) {
  _schemaCache.columns.delete(`${tableName}.${columnName}`);
}

function toPosIntOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function resolveFolderIdForGallery(pgClient, galleryId, rawFolderId) {
  const folderId = toPosIntOrNull(rawFolderId);
  if (!folderId) return null;
  if (!(await hasTable(pgClient, 'king_photo_folders'))) return null;
  const hasFolderId = await hasColumn(pgClient, 'king_photos', 'folder_id');
  if (!hasFolderId) return null;
  const f = await pgClient.query(
    'SELECT id FROM king_photo_folders WHERE id=$1 AND gallery_id=$2 LIMIT 1',
    [folderId, galleryId]
  );
  return f.rows.length ? folderId : null;
}

async function listFoldersForGallery(pgClient, galleryId) {
  if (!(await hasTable(pgClient, 'king_photo_folders'))) return [];
  const hasFolderId = await hasColumn(pgClient, 'king_photos', 'folder_id');
  if (!hasFolderId) return [];
  const res = await pgClient.query(
    `SELECT
       f.id,
       f.gallery_id,
       f.name,
       f.sort_order,
       COALESCE(f.cover_photo_id, fpick.id) AS cover_photo_id,
       f.created_at,
       COALESCE(pc.photo_count, 0)::INTEGER AS photo_count,
       COALESCE(cp.original_name, fpick.original_name) AS cover_photo_name,
       COALESCE(cp.file_path, fpick.file_path) AS cover_file_path
     FROM king_photo_folders f
     LEFT JOIN (
       SELECT folder_id, COUNT(*)::INTEGER AS photo_count
       FROM king_photos
       WHERE gallery_id=$1 AND folder_id IS NOT NULL
       GROUP BY folder_id
     ) pc ON pc.folder_id = f.id
     LEFT JOIN LATERAL (
       SELECT p.id, p.original_name, p.file_path
       FROM king_photos p
       WHERE p.gallery_id = f.gallery_id
         AND p.folder_id = f.id
       ORDER BY p."order" ASC, p.id ASC
       LIMIT 1
     ) fpick ON TRUE
     LEFT JOIN king_photos cp
       ON cp.id = f.cover_photo_id
      AND cp.gallery_id = f.gallery_id
     WHERE f.gallery_id=$1
     ORDER BY f.sort_order ASC, f.id ASC`,
    [galleryId]
  );
  return (res.rows || []).map((row) => {
    const out = {
      id: row.id,
      gallery_id: row.gallery_id,
      name: row.name,
      sort_order: parseInt(row.sort_order, 10) || 0,
      cover_photo_id: row.cover_photo_id ? parseInt(row.cover_photo_id, 10) : null,
      photo_count: parseInt(row.photo_count, 10) || 0,
      created_at: row.created_at
    };
    const fp = String(row.cover_file_path || '');
    if (fp.toLowerCase().startsWith('r2:')) {
      const objectKey = fp.slice(3).trim().replace(/^\/+/, '');
      if (objectKey) out.cover_photo_url = r2PublicUrl(objectKey) || undefined;
    }
    if (row.cover_photo_name) out.cover_photo_name = row.cover_photo_name;
    return out;
  });
}

async function runAutoSeparateByFaceInternal(pgClient, galleryId, minSimilarity) {
  const needed = ['king_photo_folders', 'rekognition_photo_faces', 'rekognition_face_matches', 'king_gallery_clients'];
  for (const t of needed) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await hasTable(pgClient, t))) {
      return {
        updated: 0,
        assignments: [],
        folders: await listFoldersForGallery(pgClient, galleryId),
        message: `Tabela ${t} não encontrada. Execute as migrations faciais e de pastas.`
      };
    }
  }
  if (!(await hasColumn(pgClient, 'king_photos', 'folder_id'))) {
    return {
      updated: 0,
      assignments: [],
      folders: await listFoldersForGallery(pgClient, galleryId),
      message: 'Coluna king_photos.folder_id não encontrada. Execute a migration 206.'
    };
  }

  const matchRes = await pgClient.query(
    `WITH ranked AS (
       SELECT
         kp.id AS photo_id,
         kgc.id AS client_id,
         COALESCE(NULLIF(BTRIM(kgc.nome), ''), CONCAT('Pessoa ', kgc.id::text)) AS folder_name,
         MAX(rfm.similarity)::float8 AS best_similarity
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       JOIN king_gallery_clients kgc ON kgc.id = rfm.client_id AND kgc.gallery_id = kp.gallery_id
       WHERE kp.gallery_id = $1
         AND (kgc.email IS NULL OR lower(kgc.email) NOT LIKE '__ks_face_%@internal.king')
       GROUP BY kp.id, kgc.id, COALESCE(NULLIF(BTRIM(kgc.nome), ''), CONCAT('Pessoa ', kgc.id::text))
     ),
     picked AS (
       SELECT DISTINCT ON (photo_id)
         photo_id, client_id, folder_name, best_similarity
       FROM ranked
       WHERE best_similarity >= $2
       ORDER BY photo_id, best_similarity DESC, client_id ASC
     )
     SELECT * FROM picked`,
    [galleryId, minSimilarity]
  );
  const picked = matchRes.rows || [];
  if (!picked.length) {
    return {
      updated: 0,
      assignments: [],
      folders: await listFoldersForGallery(pgClient, galleryId),
      message: 'Não encontrei correspondências faciais suficientes. Rode "Processar reconhecimento em todas as fotos" e tente novamente.'
    };
  }

  const folderNames = Array.from(new Set(picked.map((r) => String(r.folder_name || '').trim()).filter(Boolean)));
  const foldersBefore = await listFoldersForGallery(pgClient, galleryId);
  const folderIdByName = new Map(
    foldersBefore.map((f) => [String(f.name || '').trim().toLowerCase(), parseInt(f.id, 10)]).filter((x) => x[1])
  );
  let sortBase = 10;
  if (foldersBefore.length) {
    sortBase = Math.max(...foldersBefore.map((f) => parseInt(f.sort_order, 10) || 0)) + 10;
  }
  for (const name of folderNames) {
    const key = name.toLowerCase();
    if (folderIdByName.has(key)) continue;
    // eslint-disable-next-line no-await-in-loop
    const ins = await pgClient.query(
      `INSERT INTO king_photo_folders (gallery_id, name, sort_order)
       VALUES ($1,$2,$3)
       RETURNING id`,
      [galleryId, name.slice(0, 120), sortBase]
    );
    sortBase += 10;
    const id = parseInt(ins.rows?.[0]?.id, 10);
    if (id) folderIdByName.set(key, id);
  }

  const assignments = [];
  for (const row of picked) {
    const photoId = parseInt(row.photo_id, 10);
    const folderId = folderIdByName.get(String(row.folder_name || '').trim().toLowerCase()) || null;
    if (!photoId || !folderId) continue;
    assignments.push({ photoId, folderId });
  }
  if (!assignments.length) {
    return {
      updated: 0,
      assignments: [],
      folders: await listFoldersForGallery(pgClient, galleryId),
      message: 'Nenhuma atribuição válida foi gerada.'
    };
  }

  await pgClient.query('BEGIN');
  try {
    for (const a of assignments) {
      // eslint-disable-next-line no-await-in-loop
      await pgClient.query(
        'UPDATE king_photos SET folder_id=$1 WHERE id=$2 AND gallery_id=$3',
        [a.folderId, a.photoId, galleryId]
      );
    }

    const folderIds = Array.from(new Set(assignments.map((a) => a.folderId)));
    for (const fid of folderIds) {
      // eslint-disable-next-line no-await-in-loop
      await pgClient.query(
        `UPDATE king_photo_folders f
         SET cover_photo_id = COALESCE(
           f.cover_photo_id,
           (
             SELECT p.id
             FROM king_photos p
             WHERE p.gallery_id = $1 AND p.folder_id = $2
             ORDER BY p."order" ASC, p.id ASC
             LIMIT 1
           )
         ),
         updated_at = NOW()
         WHERE f.gallery_id = $1 AND f.id = $2`,
        [galleryId, fid]
      );
    }
    await pgClient.query('COMMIT');
  } catch (e) {
    await pgClient.query('ROLLBACK');
    throw e;
  }

  return {
    updated: assignments.length,
    assignments,
    folders: await listFoldersForGallery(pgClient, galleryId),
    message: null
  };
}

/**
 * Galeria sem nenhum king_gallery_clients (ex.: sem cliente_email no backfill 153):
 * cria uma ficha interna só para amarrar enroll/cache de rosto (FK em rekognition_*).
 */
/**
 * Galeria com vários visitantes reais + JWT sem clientId (signup-enter / public-enter com sk):
 * uma ficha interna por sessão para enroll/cache de rosto, sem misturar dados entre browsers.
 */
async function ensureSessionKingGalleryClientForFace(pgClient, galleryId, sessionKeyRaw) {
  const sessionKey = String(sessionKeyRaw || '').trim();
  if (!sessionKey || sessionKey.length < 8) return null;
  if (!(await hasTable(pgClient, 'king_gallery_clients'))) return null;
  const h = crypto.createHash('sha256').update(`${galleryId}|${sessionKey}`).digest('hex').slice(0, 32);
  const email = `__ks_face_sess_${h}@internal.king`;
  const existing = await pgClient.query(
    'SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND lower(email)=lower($2) LIMIT 1',
    [galleryId, email]
  );
  if (existing.rows.length) return parseInt(existing.rows[0].id, 10);
  const ph = crypto.randomBytes(16).toString('hex');
  try {
    const ins = await pgClient.query(
      `INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, $4, NULL, TRUE, NOW(), NOW()) RETURNING id`,
      [galleryId, 'Sessão (reconhecimento facial)', email, ph]
    );
    return parseInt(ins.rows[0].id, 10);
  } catch (e) {
    if (e.code === '23505') {
      const again = await pgClient.query(
        'SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND lower(email)=lower($2) LIMIT 1',
        [galleryId, email]
      );
      if (again.rows.length) return parseInt(again.rows[0].id, 10);
    }
    throw e;
  }
}

async function ensureDefaultKingGalleryClientForFace(pgClient, galleryId) {
  const email = `__ks_face_default_${galleryId}@internal.king`;
  const existing = await pgClient.query(
    'SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND lower(email)=lower($2) LIMIT 1',
    [galleryId, email]
  );
  if (existing.rows.length) return parseInt(existing.rows[0].id, 10);
  const ph = crypto.randomBytes(16).toString('hex');
  try {
    const ins = await pgClient.query(
      `INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, $4, NULL, TRUE, NOW(), NOW()) RETURNING id`,
      [galleryId, 'Acesso galeria (reconhecimento)', email, ph]
    );
    return parseInt(ins.rows[0].id, 10);
  } catch (e) {
    if (e.code === '23505') {
      const again = await pgClient.query(
        'SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND lower(email)=lower($2) LIMIT 1',
        [galleryId, email]
      );
      if (again.rows.length) return parseInt(again.rows[0].id, 10);
    }
    throw e;
  }
}

function isTechnicalFaceGalleryClientEmail(email) {
  const e = String(email || '').toLowerCase();
  return e.startsWith('__ks_face_default_') || e.startsWith('__ks_face_sess_');
}

/**
 * JWT com clientId, ou um único visitante “real”, ou ficha técnica / sessão (sk) / galeria vazia.
 * Várias fichas reais sem clientId e sem sk → null.
 */
async function resolveFaceClientIdForSession(pgClient, galleryId, jwtCid, sessionKey) {
  const cid = parseInt(jwtCid, 10);
  if (Number.isFinite(cid) && cid > 0) return cid;
  if (!(await hasTable(pgClient, 'king_gallery_clients'))) return null;
  const cr = await pgClient.query(
    `SELECT id, email FROM king_gallery_clients WHERE gallery_id=$1 AND (enabled IS DISTINCT FROM false) ORDER BY id ASC`,
    [galleryId]
  );
  const realRows = cr.rows.filter((r) => !isTechnicalFaceGalleryClientEmail(r.email));
  if (realRows.length === 1) return parseInt(realRows[0].id, 10);
  if (realRows.length === 0 && cr.rows.length === 1 && isTechnicalFaceGalleryClientEmail(cr.rows[0].email)) {
    return parseInt(cr.rows[0].id, 10);
  }
  if (realRows.length === 0 && cr.rows.length === 0) {
    return await ensureDefaultKingGalleryClientForFace(pgClient, galleryId);
  }
  const sk = sessionKey && String(sessionKey).trim() ? String(sessionKey).trim().slice(0, 40) : null;
  /* Sem clientId no JWT: vários convidados reais, ou só fichas técnicas — amarra rosto à sessão (sk). */
  if (sk && (realRows.length === 0 || realRows.length > 1)) {
    const sid = await ensureSessionKingGalleryClientForFace(pgClient, galleryId, sk);
    if (sid) return sid;
  }
  return null;
}

function normalizeClientImageQuality(raw) {
  const s = String(raw || 'low').toLowerCase();
  if (s === 'hd' || s === 'high') return 'hd';
  if (s === 'max' || s === 'maximum' || s === 'full') return 'max';
  return 'low';
}

/** Preview/download cliente: thumb fixo; resto conforme qualidade da galeria. */
function getClientPreviewOutputSpec(quality, useThumb) {
  if (useThumb) return { max: 400, jpegQuality: 76 };
  const q = normalizeClientImageQuality(quality);
  if (q === 'max') return { max: 5000, jpegQuality: 92 };
  if (q === 'hd') return { max: 2400, jpegQuality: 88 };
  return { max: 1200, jpegQuality: 80 };
}

const KS_GALLERY_STATUS_ORDER = Object.freeze({
  preparacao: 0,
  andamento: 1,
  revisao: 2,
  finalizado: 3
});

const KS_RANK_TO_STATUS = ['preparacao', 'andamento', 'revisao', 'finalizado'];

function ksGalleryStatusRank(raw) {
  const k = String(raw || '').toLowerCase().trim();
  if (Object.prototype.hasOwnProperty.call(KS_GALLERY_STATUS_ORDER, k)) {
    return KS_GALLERY_STATUS_ORDER[k];
  }
  return null;
}

/**
 * Multi-cliente: resumo = menor progresso entre visitantes ativos (pior caso).
 * Ex.: um em preparação e outro finalizado → preparacao. Só com 2+ ativos; caso contrário null (usa king_galleries.status).
 */
function aggregateGalleryStatusFromClientRows(clientRows) {
  if (!Array.isArray(clientRows) || clientRows.length === 0) return null;
  const active = clientRows.filter(c => c && c.enabled !== false && !isTechnicalFaceGalleryClientEmail(c.email));
  if (active.length < 2) return null;
  let minR = null;
  for (const c of active) {
    const r = ksGalleryStatusRank(c.status);
    if (r == null) continue;
    if (minR === null || r < minR) minR = r;
  }
  if (minR === null) return null;
  return KS_RANK_TO_STATUS[minR] || null;
}

/** Rodada atual de seleção (multi-client: king_gallery_clients; legado: king_galleries). */
async function ksGetCurrentSelectionRound(pgClient, galleryId, cid) {
  const hasCliRound = (await hasTable(pgClient, 'king_gallery_clients')) &&
    (await hasColumn(pgClient, 'king_gallery_clients', 'selection_round'));
  if (cid && hasCliRound) {
    const r = await pgClient.query(
      'SELECT selection_round FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2 LIMIT 1',
      [cid, galleryId]
    );
    const v = parseInt(r.rows[0]?.selection_round, 10);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }
  if (await hasColumn(pgClient, 'king_galleries', 'selection_round')) {
    const r = await pgClient.query('SELECT selection_round FROM king_galleries WHERE id=$1', [galleryId]);
    const v = parseInt(r.rows[0]?.selection_round, 10);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }
  return 1;
}

function parseKsClientContext(payload) {
  const rawId = payload && payload.clientId;
  const cid = rawId != null && rawId !== '' ? parseInt(rawId, 10) : null;
  const sk = payload && payload.sk && String(payload.sk).trim() ? String(payload.sk).trim().slice(0, 40) : null;
  return {
    cid: Number.isFinite(cid) && cid > 0 ? cid : null,
    sk: sk || null
  };
}

/** Status vindo do PG às vezes com acento (ex.: revisão) — normalizar para chaves internas. */
function normKsStatus(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isKsClientLockedStatus(statusNorm) {
  return statusNorm === 'revisao' || statusNorm === 'finalizado';
}

/** Galeria em modo visitante (cadastro ao enviar / signup + autocadastro). */
function ksGalleryRowIsDeferredSignup(row, hasAccessModeCol, hasAllowSelfCol) {
  if (!row) return false;
  let am = hasAccessModeCol ? String(row.access_mode || 'private').toLowerCase() : 'private';
  if (am === 'password') am = 'signup';
  const allowSelf = hasAllowSelfCol ? !!row.allow_self_signup : (am === 'signup' || am === 'paid_event_photos');
  return (am === 'signup' || am === 'paid_event_photos') && allowSelf;
}

/**
 * tyh (thank-you hold): true = acabou de enviar (só ecrã obrigado até sair); false = reentrou com nome/e-mail/telefone.
 * Omitido em JWT legado: revisão continua bloqueada como antes.
 */
function ksClientJwtThankYouHold(jwtPayload, clientStatusNorm) {
  if (!jwtPayload || typeof jwtPayload !== 'object') return isKsClientLockedStatus(clientStatusNorm);
  if (jwtPayload.tyh === false) return false;
  if (jwtPayload.tyh === true) return true;
  return isKsClientLockedStatus(clientStatusNorm);
}

function ksNormAccessMode(raw) {
  let am = String(raw || 'private').toLowerCase().trim();
  if (am === 'password') am = 'signup';
  if (!['private', 'signup', 'public', 'paid_event_photos'].includes(am)) am = 'private';
  return am;
}

function ksIsPaidEventAccessMode(raw) {
  return ksNormAccessMode(raw) === 'paid_event_photos';
}

function ksAccessModeAllowsSelfSignup(accessMode) {
  const am = ksNormAccessMode(accessMode);
  return am === 'signup' || am === 'paid_event_photos';
}

function ksNormDeliveryMode(raw) {
  const s = String(raw || '').toLowerCase().trim();
  return s === 'edited' ? 'edited' : 'original';
}

function ksNormPaymentStatus(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'confirmed' || s === 'paid') return 'confirmed';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

function ksNormalizeOverLimitPolicy(raw) {
  const s = String(raw || '').toLowerCase().trim();
  return ['allow_and_warn', 'block_selection', 'allow_extra_per_photo'].includes(s) ? s : 'allow_and_warn';
}

function ksNormalizePriceMode(raw) {
  const s = String(raw || '').toLowerCase().trim();
  return ['packages_only', 'packages_plus_unit', 'best_price_auto'].includes(s) ? s : 'best_price_auto';
}

function ksMoneyToCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function ksComputeBestPriceCents(selectedCount, packages, unitPriceCents, priceMode) {
  const n = Math.max(0, parseInt(selectedCount, 10) || 0);
  const mode = ksNormalizePriceMode(priceMode);
  const unit = Math.max(0, parseInt(unitPriceCents, 10) || 0);
  const packs = (Array.isArray(packages) ? packages : [])
    .map((p) => ({
      qty: Math.max(1, parseInt(p.photo_qty, 10) || 0),
      price: Math.max(0, parseInt(p.price_cents, 10) || 0)
    }))
    .filter((p) => p.qty > 0 && p.price >= 0);
  if (n <= 0) return 0;
  if (!packs.length) return mode === 'packages_only' ? 0 : n * unit;

  if (mode === 'packages_only') {
    const exact = packs.find((p) => p.qty === n);
    return exact ? exact.price : 0;
  }

  if (mode === 'packages_plus_unit') {
    let best = n * unit;
    for (const p of packs) {
      if (p.qty === n) best = Math.min(best || Number.MAX_SAFE_INTEGER, p.price);
      if (p.qty < n) best = Math.min(best || Number.MAX_SAFE_INTEGER, p.price + ((n - p.qty) * unit));
    }
    return Number.isFinite(best) ? best : (n * unit);
  }

  const maxQty = Math.max(...packs.map((p) => p.qty), 0);
  const cap = Math.max(n, n + maxQty);
  const INF = Number.MAX_SAFE_INTEGER;
  const dp = Array(cap + 1).fill(INF);
  dp[0] = 0;
  for (let i = 0; i <= cap; i += 1) {
    if (dp[i] === INF) continue;
    if (unit > 0 && i + 1 <= cap) dp[i + 1] = Math.min(dp[i + 1], dp[i] + unit);
    for (const p of packs) {
      if (i + p.qty <= cap) dp[i + p.qty] = Math.min(dp[i + p.qty], dp[i] + p.price);
    }
  }
  let out = dp[n];
  for (let i = n + 1; i <= cap; i += 1) out = Math.min(out, dp[i]);
  if (!Number.isFinite(out) || out === INF) out = n * unit;
  return out;
}

async function ksListSalePackages(pgClient, galleryId) {
  if (!(await hasTable(pgClient, 'king_gallery_sale_packages'))) return [];
  const rows = (await pgClient.query(
    `SELECT id, name, photo_qty, price_cents, sort_order, active
     FROM king_gallery_sale_packages
     WHERE gallery_id=$1
     ORDER BY sort_order ASC, photo_qty ASC, id ASC`,
    [galleryId]
  )).rows || [];
  return rows.map((r) => ({
    id: parseInt(r.id, 10) || 0,
    name: String(r.name || '').trim() || 'Pacote',
    photo_qty: Math.max(1, parseInt(r.photo_qty, 10) || 1),
    price_cents: Math.max(0, parseInt(r.price_cents, 10) || 0),
    sort_order: parseInt(r.sort_order, 10) || 0,
    active: r.active !== false
  }));
}

const ksDownloadLimiter = new Map();
function ksEnforceDownloadRateLimit(galleryId, clientId, ip) {
  const key = `${galleryId}:${clientId || 'anon'}:${String(ip || '').slice(0, 80)}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxHits = 40;
  const row = ksDownloadLimiter.get(key) || { t0: now, hits: 0 };
  if (now - row.t0 > windowMs) {
    row.t0 = now;
    row.hits = 0;
  }
  row.hits += 1;
  ksDownloadLimiter.set(key, row);
  return row.hits <= maxHits;
}

function ksNormClientNameMatch(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function ksNormClientPhoneDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

/** Cadastros antigos sem telefone útil: não exige bater dígitos; novo envio pode preencher o campo. */
function ksClientPhoneMatchesStored(storedTel, inputTel) {
  const stored = ksNormClientPhoneDigits(storedTel || '');
  if (!stored || stored.length < 8) return true;
  return stored === ksNormClientPhoneDigits(inputTel || '');
}

function ksShouldBackfillClientPhone(storedTel, inputTel) {
  const stored = ksNormClientPhoneDigits(storedTel || '');
  const input = ksNormClientPhoneDigits(inputTel || '');
  return stored.length < 8 && input.length >= 8;
}

/** Travamento da galeria para o cliente: em revisão com fluxo “cadastro ao enviar”, permite editar se tyh=false. */
async function ksResolveClientSelectionLocked(pgClient, req, galleryId, galleryRow) {
  const stGallery = normKsStatus(galleryRow?.status);
  let locked = isKsClientLockedStatus(stGallery);
  const { cid } = req.ksCtx || {};
  const jwtPayload = req.ksClient;

  const hasClientTable = await hasTable(pgClient, 'king_gallery_clients');
  const hasClientStatus = hasClientTable && (await hasColumn(pgClient, 'king_gallery_clients', 'status'));
  let clientStNorm = null;

  if (cid && hasClientStatus) {
    const stRes = await pgClient.query('SELECT status FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2', [cid, galleryId]);
    clientStNorm = normKsStatus(stRes.rows?.[0]?.status);
    if (clientStNorm) locked = isKsClientLockedStatus(clientStNorm);
  }

  if (clientStNorm === 'finalizado') return true;

  if (cid && clientStNorm === 'revisao') {
    const hasAm = await hasColumn(pgClient, 'king_galleries', 'access_mode');
    const hasSelf = await hasColumn(pgClient, 'king_galleries', 'allow_self_signup');
    const row = { ...galleryRow };
    if ((hasAm && row.access_mode === undefined) || (hasSelf && row.allow_self_signup === undefined)) {
      const cols = ['id'];
      if (hasAm) cols.push('access_mode');
      if (hasSelf) cols.push('allow_self_signup');
      const gr = await pgClient.query(`SELECT ${cols.join(', ')} FROM king_galleries WHERE id=$1`, [galleryId]);
      Object.assign(row, gr.rows[0] || {});
    }
    const deferred = ksGalleryRowIsDeferredSignup(row, hasAm, hasSelf);
    if (deferred) {
      const thankYouHold = ksClientJwtThankYouHold(jwtPayload, clientStNorm);
      locked = thankYouHold;
    }
  }

  return locked;
}

function getPwCryptoKey() {
  // Chave para criptografar a senha do cliente (para o fotógrafo conseguir reenviar via WhatsApp)
  // Preferir variável específica; fallback para o jwt.secret.
  const raw = (process.env.KINGSELECTION_PW_KEY || config.jwt.secret || '').toString();
  // Derivar 32 bytes estáveis
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptPassword(plain) {
  const iv = crypto.randomBytes(12);
  const key = getPwCryptoKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // formato: base64(iv).base64(tag).base64(ciphertext)
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

function decryptPassword(payload) {
  try {
    const [ivB64, tagB64, dataB64] = String(payload || '').split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const key = getPwCryptoKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return out.toString('utf8');
  } catch (e) {
    return null;
  }
}

function getAccountHash() {
  // ATENÇÃO:
  // Para URL de entrega (imagedelivery.net) é necessário o "account hash" do Cloudflare Images,
  // NÃO o Account ID. Sem isso, o preview quebra (thumbnail não carrega).
  return (
    (config.cloudflare && config.cloudflare.accountHash) ||
    process.env.CLOUDFLARE_ACCOUNT_HASH ||
    process.env.CF_IMAGES_ACCOUNT_HASH ||
    null
  );
}

function getCfAccountId() {
  return (
    process.env.CF_IMAGES_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID ||
    null
  );
}

function getCfApiToken() {
  return (
    (config.cloudflare && config.cloudflare.apiToken) ||
    process.env.CF_IMAGES_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    null
  );
}

function getCfGlobalApiKey() {
  return process.env.CLOUDFLARE_API_KEY || null;
}

function getCfAuthEmail() {
  return process.env.CLOUDFLARE_EMAIL || null;
}

function getCfAuthHeaders(accept = 'application/json') {
  const apiToken = getCfApiToken();
  if (apiToken) {
    return {
      Authorization: `Bearer ${String(apiToken).trim()}`,
      Accept: accept
    };
  }
  const apiKey = getCfGlobalApiKey();
  const email = getCfAuthEmail();
  if (apiKey && email) {
    return {
      'X-Auth-Email': String(email).trim(),
      'X-Auth-Key': String(apiKey).trim(),
      Accept: accept
    };
  }
  return null;
}

function buildCfUrl(imageId) {
  const hash = getAccountHash();
  if (!hash) return null;
  return `https://imagedelivery.net/${hash}/${imageId}/public`;
}

function getDefaultWatermarkAssetAbsPath() {
  // Marca d’água oficial (arquivo no projeto)
  // Pode ser sobrescrita via env: KINGSELECTION_DEFAULT_WATERMARK_FILE (caminho relativo ao repo)
  const rel = (process.env.KINGSELECTION_DEFAULT_WATERMARK_FILE || '').toString().trim();
  if (rel) return path.resolve(__dirname, '..', rel);
  return path.resolve(__dirname, '..', 'public_html', 'marca dagua KingSelection .png');
}

async function fetchDefaultWatermarkAssetBuffer() {
  // Suporta também:
  // - KINGSELECTION_DEFAULT_WATERMARK_FILE=cfimage:<id>  (Cloudflare Images)
  // - KINGSELECTION_DEFAULT_WATERMARK_FILE=https://...png (URL pública)
  const raw = (process.env.KINGSELECTION_DEFAULT_WATERMARK_FILE || '').toString().trim();
  if (raw) {
    const low = raw.toLowerCase();
    if (low.startsWith('cfimage:')) {
      const id = raw.slice('cfimage:'.length).trim();
      if (id) {
        const b = await fetchCloudflareImageBuffer(id);
        if (b) return b;
      }
    }
    if (low.startsWith('http://') || low.startsWith('https://')) {
      try {
        const r = await fetch(raw);
        if (r.ok) return r.buffer();
      } catch (_) { }
    }
  }

  // Tentar caminhos conhecidos (o arquivo tem um espaço no nome; alguns deploys podem remover)
  const baseDir = path.resolve(__dirname, '..', 'public_html');
  const repoRoot = path.resolve(__dirname, '..');
  const candidates = [
    getDefaultWatermarkAssetAbsPath(),
    // Alguns deploys/versionamentos colocam o arquivo na raiz do repo
    path.resolve(repoRoot, 'marca dagua KingSelection .png'),
    path.resolve(repoRoot, 'marca dagua KingSelection.png'),
    path.resolve(repoRoot, 'marca_dagua_kingselection.png'),
    path.resolve(baseDir, 'marca dagua KingSelection.png'),
    path.resolve(baseDir, 'marca_dagua_kingselection.png'),
    path.resolve(baseDir, 'marca_dagua_kingselection_.png')
  ];
  for (const abs of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fs.promises.readFile(abs);
    } catch (_) { }
  }
  // Fallback: procurar por nome parecido (public_html e raiz)
  try {
    const names = await fs.promises.readdir(baseDir);
    const pick = names.find(n => {
      const norm = String(n).toLowerCase().replace(/\s+/g, ' ').trim();
      return norm.includes('marca') && norm.includes('dagua') && norm.includes('kingselection') && norm.endsWith('.png');
    });
    if (!pick) return null;
    return await fs.promises.readFile(path.resolve(baseDir, pick));
  } catch (e) {
    // tenta também na raiz
    try {
      const names2 = await fs.promises.readdir(repoRoot);
      const pick2 = names2.find(n => {
        const norm = String(n).toLowerCase().replace(/\s+/g, ' ').trim();
        return norm.includes('marca') && norm.includes('dagua') && norm.includes('kingselection') && norm.endsWith('.png');
      });
      if (!pick2) return null;
      return await fs.promises.readFile(path.resolve(repoRoot, pick2));
    } catch (_) {
      return null;
    }
  }
}

async function deleteCloudflareImage(imageId) {
  // Deletar do Cloudflare Images (não é R2)
  const accountId = getCfAccountId();
  const headers = getCfAuthHeaders('application/json');
  if (!accountId || !headers) return false;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
  let attempt = 0;
  let waitMs = 600;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url, { method: 'DELETE', headers });
    // Se já não existir (404), tratamos como "ok"
    if (resp.status === 404) return true;
    if (resp.ok) return true;

    // Retry em 429/5xx (Cloudflare pode rate-limitar)
    if ((resp.status === 429 || resp.status >= 500) && attempt < 4) {
      const ra = parseInt(resp.headers.get('retry-after') || '0', 10);
      const sleepMs = ra > 0 ? Math.min(ra * 1000, 8000) : waitMs;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, sleepMs + Math.round(Math.random() * 250)));
      waitMs = Math.min(waitMs * 2, 12000);
      attempt += 1;
      continue;
    }
    return false;
  }
}

async function fetchCloudflareImageBuffer(imageId) {
  // 1) Preferir delivery (menos rate-limit e costuma estar em cache)
  const deliveryUrl = buildCfUrl(imageId);
  if (deliveryUrl) {
    // tentar variants comuns
    const variants = ['public', 'preview', 'thumbnail'];
    for (const v of variants) {
      // eslint-disable-next-line no-await-in-loop
      const r = await fetch(`https://imagedelivery.net/${getAccountHash()}/${imageId}/${v}`);
      if (r.ok) return r.buffer();
    }
  }

  // 2) Fallback: API blob (quando o delivery não está disponível)
  const accountId = getCfAccountId();
  const headers = getCfAuthHeaders('image/*');
  if (accountId && headers) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}/blob`;
    let attempt = 0;
    let waitMs = 450;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const imgRes = await fetch(url, { headers });
      if (imgRes.ok) return imgRes.buffer();
      // Retry em 429/5xx (Cloudflare pode rate-limitar)
      if ((imgRes.status === 429 || imgRes.status >= 500) && attempt < 4) {
        const ra = parseInt(imgRes.headers.get('retry-after') || '0', 10);
        const sleepMs = ra > 0 ? Math.min(ra * 1000, 5000) : waitMs;
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, sleepMs));
        waitMs = Math.min(waitMs * 2, 3000);
        attempt += 1;
        continue;
      }
      break;
    }
  }

  return null;
}

function normalizeR2Key(key) {
  if (!key || typeof key !== 'string') return null;
  const k = key.trim().replace(/^\/+/, '').replace(/\/+/g, '/');
  return k && k.startsWith('galleries/') ? k : null;
}

function extractR2Key(filePath) {
  const fp = String(filePath || '').trim();
  if (!fp) return null;
  const low = fp.toLowerCase();
  if (low.startsWith('r2:')) {
    const key = fp.slice('r2:'.length).trim().replace(/^\/+/, '');
    return normalizeR2Key(key) || null;
  }
  if (fp.startsWith('galleries/')) return normalizeR2Key(fp);
  const m = fp.match(/galleries\/[^\s"']+/i);
  if (m) return normalizeR2Key(m[0]);
  return null;
}

async function fetchPhotoFileBufferFromFilePath(filePath) {
  const fp = String(filePath || '').trim();
  if (!fp) return null;
  const low = fp.toLowerCase();
  if (low.startsWith('cfimage:')) {
    const imageId = fp.slice('cfimage:'.length).trim();
    if (!imageId) return null;
    return await fetchCloudflareImageBuffer(imageId);
  }
  const key = extractR2Key(filePath);
  if (key) {
    const cfg = getR2Config();
    // Priorizar URL pública (evita SSL do Render -> R2)
    if (cfg.publicBaseUrl) {
      const buf = await r2GetObjectViaPublicUrl(key);
      if (buf) return buf;
    }
    return await r2GetObjectBuffer(key);
  }
  return null;
}

async function loadWatermarkForGallery(pgClient, galleryId) {
  const hasMode = await hasColumn(pgClient, 'king_galleries', 'watermark_mode');
  const hasPath = await hasColumn(pgClient, 'king_galleries', 'watermark_path');
  const hasOpacity = await hasColumn(pgClient, 'king_galleries', 'watermark_opacity');
  const hasScale = await hasColumn(pgClient, 'king_galleries', 'watermark_scale');
  const hasRotate = await hasColumn(pgClient, 'king_galleries', 'watermark_rotate');
  // Padrão pré-configurado: transparência 15%, tamanho 119%
  const DEFAULT_OPACITY = 0.15;
  const DEFAULT_SCALE = 1.19;
  if (!hasMode && !hasPath && !hasOpacity && !hasScale && !hasRotate) return { mode: 'x', path: null, opacity: DEFAULT_OPACITY, scale: DEFAULT_SCALE, rotate: 0 };
  const cols = [
    hasMode ? 'watermark_mode' : `'x'::text AS watermark_mode`,
    hasPath ? 'watermark_path' : 'NULL::text AS watermark_path',
    hasOpacity ? 'watermark_opacity' : `${DEFAULT_OPACITY}::numeric AS watermark_opacity`,
    hasScale ? 'watermark_scale' : `${DEFAULT_SCALE}::numeric AS watermark_scale`,
    hasRotate ? 'watermark_rotate' : '0::int AS watermark_rotate'
  ].join(', ');
  const res = await pgClient.query(`SELECT ${cols} FROM king_galleries WHERE id=$1`, [galleryId]);
  if (!res.rows.length) return { mode: 'x', path: null, opacity: DEFAULT_OPACITY, scale: DEFAULT_SCALE, rotate: 0 };
  const row = res.rows[0] || {};
  const op = parseFloat(row.watermark_opacity);
  const sc = parseFloat(row.watermark_scale);
  const rot = parseInt(row.watermark_rotate || 0, 10) || 0;
  const rotate = [0, 90, 180, 270].includes(rot) ? rot : 0;
  // Normalização: antigas galerias podem estar com "x"/vazio. Como o padrão do sistema
  // é a marca d'água completa, forçamos "tile_dense" nesses casos.
  let mode = row.watermark_mode || 'x';
  if (!mode || mode === 'x' || mode === 'tile_sparse' || mode === 'tile') mode = 'tile_dense';
  return {
    mode,
    path: row.watermark_path || null,
    opacity: Number.isFinite(op) ? op : DEFAULT_OPACITY,
    scale: Number.isFinite(sc) ? sc : DEFAULT_SCALE,
    rotate
  };
}

async function buildWatermarkedJpeg({ imgBuffer, outW, outH, watermark, jpegOpts }) {
  const jq = jpegOpts?.quality ?? 82;
  const jp = jpegOpts?.progressive !== false;
  const img = sharp(imgBuffer).rotate();
  // fit: 'inside' preserva proporção e NUNCA corta - vertical fica vertical, horizontal fica horizontal
  let pipeline = img.resize(outW, outH, { fit: 'inside', withoutEnlargement: true });

  // 0) Sem marca d'água
  if (watermark && watermark.mode === 'none') {
    return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
  }

  // 1) X (default)
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
  const opDefaultX = clamp(parseFloat(watermark?.opacity), 0.0, 1.0);
  if (!watermark || watermark.mode === 'x') {
    const xOpacity = Number.isFinite(opDefaultX) ? opDefaultX : 0.15;
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
  }

  // 2) Marca d’água por arquivo (Cloudflare) ou padrão do sistema
  const fpRaw = String(watermark.path || '').trim();
  const mode = String(watermark.mode || 'x');
  const strict = !!watermark?.strict;
  let localDefaultBuf = null;

  // Para o modo "Marca d'água da Conecta King" (tile_dense), a regra é:
  // - sempre usar a marca padrão do sistema, mesmo que exista marca personalizada enviada.
  // Assim, o cliente pode enviar uma marca, mas só será usada quando selecionar o modo "logo".
  if (mode === 'tile_dense') {
    localDefaultBuf = await fetchDefaultWatermarkAssetBuffer();
    if (!localDefaultBuf) {
      if (strict) {
        const err = new Error('Marca d’água padrão não encontrada no servidor. Faça deploy do arquivo (public_html/marca dagua KingSelection .png) ou defina KINGSELECTION_DEFAULT_WATERMARK_FILE.');
        err.statusCode = 500;
        throw err;
      }
      const xOpacity = Number.isFinite(opDefaultX) ? opDefaultX : 0.15;
      const svg = Buffer.from(
        `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
           <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
           <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         </svg>`
      );
      pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
      return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
    }
  }

  // Se não há marca d’água personalizada, usar a marca d’água oficial do sistema
  if (!fpRaw && !localDefaultBuf) {
    localDefaultBuf = await fetchDefaultWatermarkAssetBuffer();
    if (!localDefaultBuf) {
      if (strict) {
        const err = new Error('Marca d’água padrão não encontrada no servidor. Faça deploy do arquivo (public_html/marca dagua KingSelection .png) ou defina KINGSELECTION_DEFAULT_WATERMARK_FILE.');
        err.statusCode = 500;
        throw err;
      }
      const xOpacity = Number.isFinite(opDefaultX) ? opDefaultX : 0.15;
      const svg = Buffer.from(
        `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
           <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
           <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         </svg>`
      );
      pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
      return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
    }
  }

  // aceitar também URL imagedelivery.net (caso alguém salve assim)
  let logoImageId = null;
  if (fpRaw.toLowerCase().startsWith('cfimage:')) {
    logoImageId = fpRaw.slice('cfimage:'.length).trim();
  } else {
    const m = fpRaw.match(/^https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\//i);
    if (m && m[1]) logoImageId = m[1];
  }

  let wmCloudBuf = null;
  let wmR2Buf = null;
  if (fpRaw.toLowerCase().startsWith('r2:')) {
    wmR2Buf = await fetchPhotoFileBufferFromFilePath(fpRaw);
  }
  // Só tentamos usar a marca personalizada quando não for tile_dense.
  if (logoImageId && mode !== 'tile_dense') {
    wmCloudBuf = await fetchCloudflareImageBuffer(logoImageId);
  }
  // Se falhou carregar personalizada e temos a oficial, usa a oficial.
  // Atenção: no modo "tile_dense" (Conecta King), a personalizada é ignorada por regra,
  // então não deve gerar erro mesmo em modo estrito.
  if (strict && mode !== 'tile_dense' && fpRaw && !wmCloudBuf && fpRaw.toLowerCase().startsWith('cfimage:')) {
    const err = new Error('Falha ao carregar marca d’água personalizada no Cloudflare (verifique CF_IMAGES_ACCOUNT_ID + token/key).');
    err.statusCode = 424;
    throw err;
  }
  // Se existe watermark_path mas o Cloudflare falhou (rate-limit/token), tenta a marca d’água oficial como fallback (não-estrito)
  if (!strict && fpRaw && !wmCloudBuf && !localDefaultBuf) {
    localDefaultBuf = await fetchDefaultWatermarkAssetBuffer();
  }
  // Se for tile_dense, força o padrão (ignora custom). Senão, prioriza R2 > Cloudflare > padrão.
  const wmBufRaw = (mode === 'tile_dense') ? localDefaultBuf : (wmR2Buf || wmCloudBuf || localDefaultBuf);
  if (!wmBufRaw) {
    // fallback seguro
    const xOpacity = clamp(parseFloat(watermark?.opacity), 0.0, 1.0) || 0.15;
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
  }
  const wmBuf = wmBufRaw;
  const opacity = clamp(parseFloat(watermark?.opacity), 0.0, 1.0);
  const scale = clamp(parseFloat(watermark?.scale), 0.10, 5.0);
  const rot = parseInt(watermark?.rotate || 0, 10) || 0;
  const rotate = [0, 90, 180, 270].includes(rot) ? rot : 0;
  const maxSide = Math.max(outW, outH);

  async function applyOpacityPng(pngBuf, op) {
    const o = clamp(parseFloat(op), 0.0, 1.0);
    if (o >= 0.999) return pngBuf;
    const meta = await sharp(pngBuf).metadata();
    const w = meta.width || 1;
    const h = meta.height || 1;
    const svgMask = Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" fill-opacity="${o}"/>
      </svg>`
    );
    // dest-in multiplica o alfa do PNG pela opacidade desejada
    return sharp(pngBuf)
      .ensureAlpha()
      .composite([{ input: svgMask, top: 0, left: 0, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }
  // Automático (ajustar na foto): escala respeitando o formato da foto
  // - horizontal: logo tende a crescer na largura
  // - vertical: logo tende a crescer na altura
  const boxW = Math.max(140, Math.round(outW * scale));
  const boxH = Math.max(140, Math.round(outH * scale));
  // IMPORTANTE: não auto-rotacionar marca d’água por EXIF (alguns PNGs ficam “de lado”).
  // Só aplica a rotação escolhida no painel.
  const wmBase = sharp(wmBuf).rotate(rotate);

  // Padrão (Conecta King): um único logo centralizado (não em mosaico)
  if (watermark?.mode === 'tile_dense') {
    let wmPng = await wmBase
      .resize({ width: boxW, height: boxH, fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
    wmPng = await applyOpacityPng(wmPng, opacity);
    let wmFinal = wmPng;
    try {
      const m = await sharp(wmFinal).metadata();
      const w = m.width || 0;
      const h = m.height || 0;
      if (w > outW || h > outH) {
        const left = Math.max(0, Math.floor((w - outW) / 2));
        const top = Math.max(0, Math.floor((h - outH) / 2));
        wmFinal = await sharp(wmFinal)
          .extract({ left, top, width: Math.min(outW, w), height: Math.min(outH, h) })
          .png()
          .toBuffer();
        pipeline = pipeline.composite([{ input: wmFinal, top: 0, left: 0, blend: 'over' }]);
      } else {
        pipeline = pipeline.composite([{ input: wmFinal, gravity: 'center', blend: 'over' }]);
      }
    } catch (_) {
      pipeline = pipeline.composite([{ input: wmFinal, gravity: 'center', blend: 'over' }]);
    }
    return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
  }

  // Modo "logo" = marca d'água personalizada (se não existir, no preview do admin mostramos erro claro)
  if (watermark?.mode === 'logo' && fpRaw && fpRaw.toLowerCase().startsWith('cfimage:') && !wmCloudBuf && strict) {
    const err = new Error('Não foi possível carregar sua marca d’água personalizada no Cloudflare (tente novamente em alguns segundos).');
    err.statusCode = 424;
    throw err;
  }
  if (watermark?.mode === 'logo' && !fpRaw && strict) {
    const err = new Error('Envie sua marca d’água personalizada para usar este modo.');
    err.statusCode = 422;
    throw err;
  }

  // Automático (ajustar no meio): fit inside e permite aumentar até 500%
  let wmPng = await wmBase
    // fit "inside" ajusta automaticamente para logo horizontal/vertical
    .resize({ width: boxW, height: boxH, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  wmPng = await applyOpacityPng(wmPng, opacity);

  // aplica no centro com opacidade usando SVG mask simples
  if (watermark?.mode === 'tile') {
    // Mosaico (tipo álbum): repete a marca d'água na foto inteira
    // Para o mosaico, o espaçamento usa o maior lado (mais estável)
    const b64 = wmPng.toString('base64');
    const stepFactor = 1.35;
    const stepMin = 180;
    const step = Math.max(stepMin, Math.round(maxSide * (Math.max(0.15, scale) * stepFactor)));
    const w = outW;
    const h = outH;
    const svg = Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="p" patternUnits="userSpaceOnUse" width="${step}" height="${step}">
            <image href="data:image/png;base64,${b64}" x="0" y="0" width="${boxW}" height="${boxH}"/>
          </pattern>
        </defs>
        <g transform="rotate(-25 ${Math.round(w / 2)} ${Math.round(h / 2)})">
          <rect x="-${w}" y="-${h}" width="${w * 3}" height="${h * 3}" fill="url(#p)"/>
        </g>
      </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
  } else {
    // Central (modo "logo"/automático). Se ficar maior que a foto, recorta no centro para evitar erro/preview preto.
    let wmFinal = wmPng;
    try {
      const m = await sharp(wmFinal).metadata();
      const w = m.width || 0;
      const h = m.height || 0;
      if (w > outW || h > outH) {
        const left = Math.max(0, Math.floor((w - outW) / 2));
        const top = Math.max(0, Math.floor((h - outH) / 2));
        wmFinal = await sharp(wmFinal)
          .extract({ left, top, width: Math.min(outW, w), height: Math.min(outH, h) })
          .png()
          .toBuffer();
        pipeline = pipeline.composite([{ input: wmFinal, top: 0, left: 0, blend: 'over' }]);
      } else {
        pipeline = pipeline.composite([{ input: wmFinal, gravity: 'center', blend: 'over' }]);
      }
    } catch (_) {
      pipeline = pipeline.composite([{ input: wmFinal, gravity: 'center', blend: 'over' }]);
    }
  }
  return pipeline.jpeg({ quality: jq, progressive: jp }).toBuffer();
}

// ===== Admin =====
router.get('/galleries', protectUser, asyncHandler(async (req, res) => {
  const profileItemId = parseInt(req.query.profileItemId, 10);
  if (!profileItemId) return res.status(400).json({ message: 'profileItemId é obrigatório' });

  const client = await db.pool.connect();
  try {
    // Garantir que o item pertence ao usuário
    const userId = req.user.userId;
    const own = await client.query('SELECT id FROM profile_items WHERE id=$1 AND user_id=$2', [profileItemId, userId]);
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão para este módulo.' });

    const gRes = await client.query(
      `SELECT * FROM king_galleries WHERE profile_item_id=$1 ORDER BY id DESC`,
      [profileItemId]
    );

    // incluir fotos (simples)
    const galleries = gRes.rows;
    const ids = galleries.map(g => g.id);
    let photosByGallery = {};
    if (ids.length) {
      const hasFav = await hasColumn(client, 'king_photos', 'is_favorite');
      const hasCover = await hasColumn(client, 'king_photos', 'is_cover');
      const cols = [
        'id',
        'gallery_id',
        'original_name',
        '"order"',
        hasFav ? 'is_favorite' : 'FALSE AS is_favorite',
        hasCover ? 'is_cover' : 'FALSE AS is_cover'
      ];
      const pRes = await client.query(
        `SELECT ${cols.join(', ')} FROM king_photos WHERE gallery_id = ANY($1::int[]) ORDER BY gallery_id, "order" ASC, id ASC`,
        [ids]
      );
      pRes.rows.forEach(p => {
        photosByGallery[p.gallery_id] = photosByGallery[p.gallery_id] || [];
        photosByGallery[p.gallery_id].push(p);
      });
    }
    // incluir contagem de selecionadas e feedback (quando houver)
    let selectionStats = {};
    if (ids.length) {
      const sRes = await client.query(
        `SELECT gallery_id, COUNT(*)::int AS selected_count, MAX(feedback_cliente) AS feedback_cliente
         FROM king_selections
         WHERE gallery_id = ANY($1::int[])
         GROUP BY gallery_id`,
        [ids]
      );
      sRes.rows.forEach(r => {
        selectionStats[r.gallery_id] = {
          selected_count: r.selected_count || 0,
          feedback_cliente: r.feedback_cliente || null
        };
      });
    }
    let statusAggByGalleryId = {};
    if (ids.length && (await hasTable(client, 'king_gallery_clients')) && (await hasColumn(client, 'king_gallery_clients', 'status'))) {
      const hasEnabledCol = await hasColumn(client, 'king_gallery_clients', 'enabled');
      const enabledSql = hasEnabledCol ? 'AND (gc.enabled IS DISTINCT FROM false)' : '';
      const aggRes = await client.query(
        `SELECT gc.gallery_id,
          MIN(
            CASE LOWER(TRIM(COALESCE(gc.status::text, '')))
              WHEN 'preparacao' THEN 0
              WHEN 'andamento' THEN 1
              WHEN 'revisao' THEN 2
              WHEN 'finalizado' THEN 3
              ELSE 999
            END
          ) AS min_rank
         FROM king_gallery_clients gc
         WHERE gc.gallery_id = ANY($1::int[])
           ${enabledSql}
           AND (
             gc.email IS NULL
             OR NOT (
               lower(gc.email) LIKE '__ks_face_default_%@internal.king'
               OR lower(gc.email) LIKE '__ks_face_sess_%@internal.king'
             )
           )
         GROUP BY gc.gallery_id
         HAVING COUNT(*) >= 2`,
        [ids]
      );
      for (const row of aggRes.rows) {
        const mr = parseInt(row.min_rank, 10);
        if (Number.isFinite(mr) && mr >= 0 && mr <= 3) {
          statusAggByGalleryId[row.gallery_id] = KS_RANK_TO_STATUS[mr];
        }
      }
    }
    const payload = galleries.map(g => ({ ...g, photos: photosByGallery[g.id] || [] }));
    const payloadWithStats = payload.map(g => ({
      ...g,
      status: statusAggByGalleryId[g.id] != null ? statusAggByGalleryId[g.id] : g.status,
      selected_count: selectionStats[g.id]?.selected_count || 0,
      feedback_cliente: selectionStats[g.id]?.feedback_cliente || null,
      photos_count: (g.photos || []).length
    }));
    const shareBaseUrl = (config.urls && config.urls.shareBase) ? config.urls.shareBase.toString().trim().replace(/\/$/, '') : null;
    res.json({ success: true, share_base_url: shareBaseUrl || undefined, galleries: payloadWithStats });
  } finally {
    client.release();
  }
}));

router.post('/galleries', protectUser, asyncHandler(async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const body = req.body || {};
    const {
      profileItemId,
      nome_projeto,
      cliente_email,
      senha,
      cliente_nome,
      categoria,
      total_fotos_contratadas,
      min_selections
    } = body;
    const pid = parseInt(profileItemId, 10);
    if (!pid || !String(nome_projeto || '').trim()) {
      return res.status(400).json({ message: 'Campos obrigatórios: profileItemId e nome do projeto.' });
    }

    let accessType = ksNormAccessMode(body.access_type || body.tipo_acesso || body.access_mode || 'private');

    const useWatermark = !(
      body.use_watermark === false ||
      body.use_watermark === 'false' ||
      body.com_marca_dagua === false ||
      body.com_marca_dagua === 'false'
    );

    const own = await client.query('SELECT id FROM profile_items WHERE id=$1 AND user_id=$2', [pid, userId]);
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão para este módulo.' });

    // slug simples
    const baseSlug = String(nome_projeto).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || `galeria-${Date.now()}`;

    let slug = baseSlug;
    let i = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await client.query('SELECT 1 FROM king_galleries WHERE slug=$1', [slug]);
      if (exists.rows.length === 0) break;
      slug = `${baseSlug}-${i++}`;
    }

    const randomPass = () => crypto.randomBytes(24).toString('base64url');

    let emailToStore;
    let plainPassword;
    let clientPasswordResponse = null;

    if (accessType === 'private') {
      const em = String(cliente_email || '').toLowerCase().trim();
      const pw = String(senha || '');
      if (!em || !pw || pw.length < 6) {
        return res.status(400).json({
          message: 'Acesso privado: informe e-mail do cliente e senha (mínimo 6 caracteres).'
        });
      }
      emailToStore = em;
      plainPassword = pw;
      clientPasswordResponse = pw;
    } else if (accessType === 'signup' || accessType === 'paid_event_photos') {
      plainPassword = randomPass();
      const localPart = `${accessType === 'paid_event_photos' ? 'paid' : 'visitante'}+${slug}`.slice(0, 200);
      emailToStore = `${localPart}@cadastro.kingselection.invalid`.slice(0, 255);
    } else {
      plainPassword = randomPass();
      const localPart = `publico+${slug}`.slice(0, 200);
      emailToStore = `${localPart}@publico.kingselection.invalid`.slice(0, 255);
    }

    const senha_hash = await bcrypt.hash(String(plainPassword), 10);

    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    const minSel = parseInt(min_selections || 0, 10) || 0;
    const total = parseInt(total_fotos_contratadas || 0, 10) || 0;

    let ins;
    if (hasMin && hasEnc) {
      const senha_enc = encryptPassword(String(plainPassword));
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, senha_enc, status, total_fotos_contratadas, min_selections)
         VALUES ($1,$2,$3,$4,$5,$6,'preparacao',$7,$8)
         RETURNING *`,
        [pid, String(nome_projeto).trim(), slug, emailToStore, senha_hash, senha_enc, total, minSel]
      );
    } else if (hasEnc) {
      const senha_enc = encryptPassword(String(plainPassword));
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, senha_enc, status, total_fotos_contratadas)
         VALUES ($1,$2,$3,$4,$5,$6,'preparacao',$7)
         RETURNING *`,
        [pid, String(nome_projeto).trim(), slug, emailToStore, senha_hash, senha_enc, total]
      );
    } else if (hasMin) {
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas, min_selections)
         VALUES ($1,$2,$3,$4,$5,'preparacao',$6,$7)
         RETURNING *`,
        [pid, String(nome_projeto).trim(), slug, emailToStore, senha_hash, total, minSel]
      );
    } else {
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas)
         VALUES ($1,$2,$3,$4,$5,'preparacao',$6)
         RETURNING *`,
        [pid, String(nome_projeto).trim(), slug, emailToStore, senha_hash, total]
      );
    }

    const gid = ins.rows[0].id;

    const now = new Date();
    const dataTrabalho = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nomeCliente = String(cliente_nome || '').trim().slice(0, 255) || null;
    const cat = String(categoria || '').trim().slice(0, 255) || null;

    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const hasClienteNome = await hasColumn(client, 'king_galleries', 'cliente_nome');
    const hasCategoria = await hasColumn(client, 'king_galleries', 'categoria');
    const hasDataTrabalho = await hasColumn(client, 'king_galleries', 'data_trabalho');
    const hasWmMode = await hasColumn(client, 'king_galleries', 'watermark_mode');
    const hasWmOpacity = await hasColumn(client, 'king_galleries', 'watermark_opacity');
    const hasWmScale = await hasColumn(client, 'king_galleries', 'watermark_scale');

    const metaSets = [];
    const metaVals = [];
    let p = 1;
    if (hasAccessMode) {
      const mode = accessType === 'public'
        ? 'public'
        : (accessType === 'paid_event_photos' ? 'paid_event_photos' : (accessType === 'signup' ? 'signup' : 'private'));
      metaSets.push(`access_mode=$${p++}`);
      metaVals.push(mode);
    }
    if (hasSelf) {
      metaSets.push(`allow_self_signup=$${p++}`);
      metaVals.push(ksAccessModeAllowsSelfSignup(accessType));
    }
    if (hasClienteNome && nomeCliente) {
      metaSets.push(`cliente_nome=$${p++}`);
      metaVals.push(nomeCliente);
    }
    if (hasCategoria && cat) {
      metaSets.push(`categoria=$${p++}`);
      metaVals.push(cat);
    }
    if (hasDataTrabalho) {
      metaSets.push(`data_trabalho=$${p++}`);
      metaVals.push(dataTrabalho);
    }

    if (useWatermark) {
      if (hasWmMode) {
        metaSets.push(`watermark_mode=COALESCE(NULLIF(watermark_mode,''),'tile_dense')`);
      }
      if (hasWmOpacity) metaSets.push('watermark_opacity=COALESCE(watermark_opacity,0.15)');
      if (hasWmScale) metaSets.push('watermark_scale=COALESCE(watermark_scale,1.19)');
    } else if (hasWmMode) {
      metaSets.push(`watermark_mode=$${p++}`);
      metaVals.push('none');
    }

    if (metaSets.length) {
      metaVals.push(gid);
      try {
        await client.query(
          `UPDATE king_galleries SET ${metaSets.join(', ')}, updated_at=NOW() WHERE id=$${p}`,
          metaVals
        );
        if (useWatermark && hasWmOpacity) ins.rows[0].watermark_opacity = 0.15;
        if (useWatermark && hasWmScale) ins.rows[0].watermark_scale = 1.19;
        if (hasAccessMode) {
          ins.rows[0].access_mode = accessType === 'public'
            ? 'public'
            : (accessType === 'paid_event_photos' ? 'paid_event_photos' : (accessType === 'signup' ? 'signup' : 'private'));
        }
        if (hasSelf) ins.rows[0].allow_self_signup = ksAccessModeAllowsSelfSignup(accessType);
        if (hasClienteNome && nomeCliente) ins.rows[0].cliente_nome = nomeCliente;
        if (hasCategoria && cat) ins.rows[0].categoria = cat;
        if (hasDataTrabalho) ins.rows[0].data_trabalho = dataTrabalho;
        if (hasWmMode) ins.rows[0].watermark_mode = useWatermark ? 'tile_dense' : 'none';
      } catch (_) { /* colunas opcionais */ }
    }

    res.status(201).json({
      success: true,
      gallery: ins.rows[0],
      client_password: clientPasswordResponse,
      access_type: accessType,
      data_trabalho: hasDataTrabalho ? dataTrabalho : undefined
    });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/status', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { status, clientId: rawClientId } = req.body || {};
  if (!galleryId || !status) return res.status(400).json({ message: 'Parâmetros inválidos' });
  if (!['preparacao', 'andamento', 'revisao', 'finalizado'].includes(status)) return res.status(400).json({ message: 'Status inválido' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const g = await client.query(
      `SELECT g.* FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (g.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    const hasClients = await hasTable(client, 'king_gallery_clients');
    const hasCliStatus = hasClients && (await hasColumn(client, 'king_gallery_clients', 'status'));
    const enRes = hasCliStatus
      ? await client.query(
        `SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND enabled=TRUE ORDER BY id ASC`,
        [galleryId]
      )
      : { rows: [] };
    const enabledRows = enRes.rows || [];
    const bodyCid = rawClientId != null && String(rawClientId).trim() !== '' ? parseInt(rawClientId, 10) : null;

    // Vários visitantes ativos: só altera o status desse cliente (não mexe em king_galleries).
    if (hasCliStatus && enabledRows.length > 1) {
      if (!bodyCid || !Number.isFinite(bodyCid) || bodyCid < 1) {
        return res.status(400).json({ message: 'Esta galeria tem vários clientes. Informe clientId no corpo da requisição.' });
      }
      const ok = enabledRows.some((r) => parseInt(r.id, 10) === bodyCid);
      if (!ok) return res.status(404).json({ message: 'Cliente não encontrado nesta galeria.' });
      await client.query(
        `UPDATE king_gallery_clients SET status=$1, updated_at=NOW() WHERE gallery_id=$2 AND id=$3`,
        [status, galleryId, bodyCid]
      );
      return res.json({ success: true, clientId: bodyCid });
    }

    await client.query('UPDATE king_galleries SET status=$1, updated_at=NOW() WHERE id=$2', [status, galleryId]);
    if (hasCliStatus && enabledRows.length === 1) {
      await client.query(
        `UPDATE king_gallery_clients SET status=$1, updated_at=NOW() WHERE gallery_id=$2 AND id=$3`,
        [status, galleryId, parseInt(enabledRows[0].id, 10)]
      );
    }
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

// Abre nova rodada de seleção: revisão → andamento, incrementa selection_round (lotes anteriores ficam “congelados” no cliente)
router.post('/galleries/:id/open-selection-round', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const bodyCid = req.body && req.body.clientId != null && String(req.body.clientId).trim() !== ''
    ? parseInt(req.body.clientId, 10)
    : null;

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    const hasClients = await hasTable(client, 'king_gallery_clients');
    const hasCliRound = hasClients && (await hasColumn(client, 'king_gallery_clients', 'selection_round'));
    const hasCliStatus = hasClients && (await hasColumn(client, 'king_gallery_clients', 'status'));
    const hasGalRound = await hasColumn(client, 'king_galleries', 'selection_round');

    let targetCid = Number.isFinite(bodyCid) && bodyCid > 0 ? bodyCid : null;
    const enabledRes = hasClients
      ? await client.query(
        `SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND enabled=TRUE ORDER BY id ASC`,
        [galleryId]
      )
      : { rows: [] };
    const enabledRows = enabledRes.rows || [];

    if (enabledRows.length > 1 && !targetCid) {
      return res.status(400).json({ message: 'Esta galeria tem vários clientes. Informe clientId no corpo da requisição.' });
    }
    if (enabledRows.length === 1 && !targetCid) targetCid = parseInt(enabledRows[0].id, 10);

    if (targetCid && hasCliRound && hasCliStatus) {
      const ok = enabledRows.some(r => parseInt(r.id, 10) === targetCid);
      if (!ok) return res.status(404).json({ message: 'Cliente não encontrado nesta galeria.' });
      const u = await client.query(
        `UPDATE king_gallery_clients
         SET status='andamento', selection_round = selection_round + 1, updated_at=NOW()
         WHERE gallery_id=$1 AND id=$2 AND status='revisao'
         RETURNING selection_round`,
        [galleryId, targetCid]
      );
      if (u.rows.length === 0) {
        return res.status(400).json({
          message: 'Só é possível abrir nova rodada quando o cliente está em revisão (já enviou a seleção).'
        });
      }
      return res.json({ success: true, selection_round: u.rows[0].selection_round, clientId: targetCid });
    }

    if (!hasGalRound) {
      return res.status(500).json({ message: 'Migração pendente: coluna selection_round em king_galleries.' });
    }
    const u = await client.query(
      `UPDATE king_galleries
       SET status='andamento', selection_round = selection_round + 1, updated_at=NOW()
       WHERE id=$1 AND status='revisao'
       RETURNING selection_round`,
      [galleryId]
    );
    if (u.rows.length === 0) {
      return res.status(400).json({
        message: 'Só é possível abrir nova rodada quando a galeria está em revisão.'
      });
    }
    if (hasCliStatus && enabledRows.length) {
      await client.query(
        `UPDATE king_gallery_clients SET status='andamento', updated_at=NOW() WHERE gallery_id=$1`,
        [galleryId]
      );
    }
    res.json({ success: true, selection_round: u.rows[0].selection_round });
  } finally {
    client.release();
  }
}));

// DELETE /galleries/:id — exclui o projeto inteiro + todas as fotos do R2 em tempo real
router.delete('/galleries/:id', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'ID inválido' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2 LIMIT 1`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(404).json({ message: 'Galeria não encontrada ou sem permissão.' });

    const hasFilePath = await hasColumn(client, 'king_photos', 'file_path');
    const hasWmPath = await hasColumn(client, 'king_galleries', 'watermark_path');

    const r2Keys = new Set();
    if (hasFilePath) {
      const pRes = await client.query(
        `SELECT file_path FROM king_photos WHERE gallery_id=$1 AND file_path IS NOT NULL AND file_path != ''`,
        [galleryId]
      );
      for (const row of pRes.rows) {
        const k = extractR2Key(row.file_path);
        if (k) r2Keys.add(k);
      }
    }
    if (hasWmPath) {
      const gRes = await client.query(
        `SELECT watermark_path FROM king_galleries WHERE id=$1 AND watermark_path IS NOT NULL AND watermark_path != ''`,
        [galleryId]
      );
      if (gRes.rows.length) {
        const k = extractR2Key(gRes.rows[0].watermark_path);
        if (k) r2Keys.add(k);
      }
    }

    let r2Deleted = 0;
    if (r2Keys.size > 0 && KS_WORKER_SECRET) {
      const keys = Array.from(r2Keys);
      const batchSize = 1000;
      for (let i = 0; i < keys.length; i += batchSize) {
        const chunk = keys.slice(i, i + batchSize);
        const out = await deleteR2BatchViaWorker(chunk);
        r2Deleted += out.deleted || 0;
      }
    }

    await client.query('DELETE FROM king_galleries WHERE id=$1', [galleryId]);
    res.json({
      success: true,
      message: 'Projeto excluído.',
      r2: { keysFound: r2Keys.size, deleted: r2Deleted }
    });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/photos', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { imageId, original_name, order } = req.body || {};
  if (!galleryId || !imageId) return res.status(400).json({ message: 'galleryId e imageId são obrigatórios' });

  const file_path = `cfimage:${imageId}`;

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const g = await client.query(
      `SELECT g.* FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (g.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    const wantedFolderId = hasFolderId
      ? await resolveFolderIdForGallery(client, galleryId, req.body?.folder_id ?? req.body?.folderId)
      : null;
    if ((req.body?.folder_id != null || req.body?.folderId != null) && hasFolderId && !wantedFolderId) {
      return res.status(400).json({ message: 'Pasta inválida para esta galeria.' });
    }

    try {
      const ins = await client.query(
        hasFolderId
          ? `INSERT INTO king_photos (gallery_id, file_path, original_name, "order", folder_id)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id, gallery_id, original_name, "order", folder_id`
          : `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
             VALUES ($1,$2,$3,$4)
             RETURNING id, gallery_id, original_name, "order"`,
        hasFolderId
          ? [galleryId, file_path, original_name || 'foto', parseInt(order || 0, 10) || 0, wantedFolderId]
          : [galleryId, file_path, original_name || 'foto', parseInt(order || 0, 10) || 0]
      );
      res.status(201).json({ success: true, photo: ins.rows[0] });
    } catch (e) {
      // Se o upload já ocorreu no Cloudflare mas o DB falhou, tentar limpar a imagem pra não ficar órfã.
      try { await deleteCloudflareImage(String(imageId)); } catch (_) { }
      return res.status(500).json({
        success: false,
        message: 'Falha ao registrar a foto na galeria (DB). A imagem foi limpa do Cloudflare quando possível.'
      });
    }
  } finally {
    client.release();
  }
}));

// ===== R2: presign em lote (upload direto, sem passar pelo Render) =====
router.post('/galleries/:id/uploads/presign-batch', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { files, prefix } = req.body || {};
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const list = Array.isArray(files) ? files : [];
  if (!list.length) return res.status(400).json({ message: 'files é obrigatório' });
  if (list.length > 100) return res.status(400).json({ message: 'Máximo de 100 arquivos por chamada.' });

  const cfg = getR2Config();
  if (!cfg.enabled) return res.status(501).json({ message: 'R2 não configurado (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET).' });

  const userId = req.user.userId;
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2
       LIMIT 1`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    // IMPORTANTE: o Bucket já é "kingselection". NÃO colocar "kingselection/" dentro do Key,
    // senão vira "bucket/bucket/..." em alguns estilos de URL e só confunde.
    const safePrefix = (prefix || `galleries/${galleryId}`).toString().replace(/^\/*/, '').replace(/\.\./g, '');
    const items = [];

    for (const f of list) {
      const clientId = (f && f.id) ? String(f.id).slice(0, 80) : crypto.randomUUID();
      const name = (f && f.name) ? String(f.name) : 'foto';
      const type = (f && f.type) ? String(f.type) : 'application/octet-stream';
      const ext = (() => {
        const m = name.match(/\.([a-zA-Z0-9]{1,8})$/);
        return m ? m[1].toLowerCase() : 'jpg';
      })();
      const key = `${safePrefix}/${crypto.randomUUID()}.${ext}`;
      // eslint-disable-next-line no-await-in-loop
      const signed = await r2PresignPut({
        key,
        contentType: type,
        cacheControl: 'public, max-age=31536000, immutable',
        expiresInSeconds: 900
      });
      items.push({
        id: clientId,
        key,
        uploadUrl: signed.uploadUrl,
        publicUrl: signed.publicUrl
      });
    }

    res.json({ success: true, items });
  } finally {
    client.release();
  }
}));

// ===== Worker: token de upload (browser -> Worker -> R2 binding) =====
router.post('/galleries/:id/uploads/worker-token', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ success: false, message: 'galleryId inválido' });
  if (!KS_WORKER_SECRET) return res.status(501).json({ success: false, message: 'Worker não configurado (KINGSELECTION_WORKER_SECRET).' });

  const userId = req.user.userId;
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2
       LIMIT 1`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ success: false, message: 'Sem permissão' });

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 10 * 60; // 10min
    const token = ksSignToken({
      typ: 'ks_upload',
      userId,
      galleryId,
      iat: now,
      exp
    });
    res.json({
      success: true,
      token,
      expiresInSeconds: exp - now,
      workerUrl: (process.env.KINGSELECTION_WORKER_URL || '').toString().trim() || null
    });
  } finally {
    client.release();
  }
}));

// Backend envia arquivo para o Worker (evita SSL do S3 no Render)
async function uploadBufferToWorker({ buffer, filename, mimetype, galleryId, userId }) {
  if (!KS_WORKER_SECRET) throw new Error('Worker não configurado');
  const workerUrl = (process.env.KINGSELECTION_WORKER_URL || process.env.R2_PUBLIC_BASE_URL || 'https://r2.conectaking.com.br').toString().trim().replace(/\/$/, '');
  const token = ksSignToken({
    typ: 'ks_upload',
    userId,
    galleryId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600
  });
  const form = new FormData();
  form.append('file', buffer, { filename: filename || 'foto.jpg', contentType: mimetype || 'image/jpeg' });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
  try {
    const res = await fetch(`${workerUrl}/ks/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, ...form.getHeaders() },
      body: form,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const text = await res.text().catch(() => '');
    const data = (() => { try { return JSON.parse(text); } catch (_) { return {}; } })();
    if (!res.ok) throw new Error(data.message || text || `Worker ${res.status}`);
    if (!data.key || !data.receipt) throw new Error('Resposta inválida do Worker');
    return { key: data.key, receipt: data.receipt };
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = e?.message || String(e);
    if (e?.name === 'AbortError') throw new Error('Tempo esgotado ao enviar para o R2. Tente novamente.');
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT')) {
      throw new Error(`Falha de conexão com o R2: ${msg.slice(0, 120)}`);
    }
    throw e;
  }
}

/** Token para ks_cleanup (list/delete-batch) - valido 5min */
function getKsCleanupToken() {
  return ksSignToken({
    typ: 'ks_cleanup',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300
  });
}

/** Lista todas as keys no R2 sob prefixo (via Worker) */
async function listR2KeysViaWorker(prefix = 'galleries/') {
  if (!KS_WORKER_SECRET) throw new Error('Worker não configurado');
  const workerUrl = (process.env.KINGSELECTION_WORKER_URL || process.env.R2_PUBLIC_BASE_URL || 'https://r2.conectaking.com.br').toString().trim().replace(/\/$/, '');
  const keys = [];
  let cursor = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(`${workerUrl}/ks/list`);
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const token = await getKsCleanupToken();
    const res = await fetch(url.toString(), { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Worker ${res.status}`);
    if (Array.isArray(data.keys)) keys.push(...data.keys);
    if (!data.truncated || !data.cursor) break;
    cursor = data.cursor;
  }
  return keys;
}

/** Deleta múltiplos objetos no R2 via Worker (batch de até 1000) */
async function deleteR2BatchViaWorker(keys) {
  if (!keys || keys.length === 0) return { deleted: 0 };
  if (!KS_WORKER_SECRET) throw new Error('Worker não configurado');
  const workerUrl = (process.env.KINGSELECTION_WORKER_URL || process.env.R2_PUBLIC_BASE_URL || 'https://r2.conectaking.com.br').toString().trim().replace(/\/$/, '');
  const validKeys = keys
    .map(k => String(k || '').trim().replace(/^\/+/, ''))
    .filter(k => k && k.startsWith('galleries/'));
  if (validKeys.length === 0) return { deleted: 0 };
  const token = await getKsCleanupToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${workerUrl}/ks/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ keys: validKeys }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    let data = {};
    try { data = JSON.parse((await res.text()) || '{}'); } catch (_) { }
    if (!res.ok) throw new Error(data.message || `Worker ${res.status}`);
    return { deleted: data.deleted ?? validKeys.length };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function deleteR2ObjectViaWorker(key) {
  if (!KS_WORKER_SECRET) throw new Error('Worker não configurado');
  const keyStr = String(key || '').trim().replace(/^\/+/, '');
  if (!keyStr || !keyStr.startsWith('galleries/')) return false;
  const workerUrl = (process.env.KINGSELECTION_WORKER_URL || process.env.R2_PUBLIC_BASE_URL || 'https://r2.conectaking.com.br').toString().trim().replace(/\/$/, '');
  const token = ksSignToken({
    typ: 'ks_delete',
    key: keyStr,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${workerUrl}/ks/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ key: keyStr }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    let data = {};
    try { data = JSON.parse((await res.text()) || '{}'); } catch (_) { }
    return res.ok && data.success === true;
  } catch (_) {
    clearTimeout(timeoutId);
    return false;
  }
}

// ===== R2: upload via backend — usa Worker (evita SSL S3 no Render) =====
router.post('/galleries/:id/uploads/proxy', protectUser, (req, res, next) => {
  // Capturar erros do multer e devolver msg clara (Render produção escondia em 500 genérico)
  uploadMem.single('file')(req, res, (err) => {
    if (!err) return next();
    // MulterError (tamanho, etc)
    const name = String(err.name || '');
    const code = String(err.code || '');
    if (name === 'MulterError' && code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Arquivo muito grande (limite 30MB). Envie uma foto menor.' });
    }
    return res.status(400).json({ success: false, message: err.message || 'Falha ao processar upload.' });
  });
}, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'Arquivo é obrigatório' });

  if (!KS_WORKER_SECRET) return res.status(501).json({ message: 'Worker não configurado (KINGSELECTION_WORKER_SECRET).' });

  const userId = req.user.userId;
  const originalName = ((req.body && (req.body.original_name || req.body.originalName)) || req.file.originalname || 'foto').toString().slice(0, 500);
  const order = parseInt((req.body && (req.body.order || 0)) || 0, 10) || 0;

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2
       LIMIT 1`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    let key;
    try {
      const out = await uploadBufferToWorker({
        buffer: req.file.buffer,
        filename: req.file.originalname || 'foto.jpg',
        mimetype: req.file.mimetype || 'application/octet-stream',
        galleryId,
        userId
      });
      key = out.key;
    } catch (e) {
      const msg = (e && e.message) ? String(e.message).slice(0, 250) : 'Falha ao enviar para o R2';
      return res.status(502).json({ success: false, message: msg });
    }

    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    const wantedFolderId = hasFolderId
      ? await resolveFolderIdForGallery(client, galleryId, req.body?.folder_id ?? req.body?.folderId)
      : null;
    if ((req.body?.folder_id != null || req.body?.folderId != null) && hasFolderId && !wantedFolderId) {
      return res.status(400).json({ success: false, message: 'Pasta inválida para esta galeria.' });
    }

    let ins = null;
    try {
      ins = await client.query(
        hasFolderId
          ? `INSERT INTO king_photos (gallery_id, file_path, original_name, "order", folder_id)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id, gallery_id, original_name, "order", file_path, folder_id`
          : `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
             VALUES ($1,$2,$3,$4)
             RETURNING id, gallery_id, original_name, "order", file_path`,
        hasFolderId
          ? [galleryId, `r2:${key}`, originalName, order, wantedFolderId]
          : [galleryId, `r2:${key}`, originalName, order]
      );
    } catch (e) {
      const msg = (e && e.message) ? String(e.message).slice(0, 250) : 'Falha ao salvar no banco';
      return res.status(500).json({ success: false, message: msg });
    }

    scheduleFaceProcessingForNewPhotos(galleryId, ins.rows);
    return res.status(201).json({ success: true, photo: ins.rows[0] });
  } finally {
    client.release();
  }
}));

// ===== Substituir foto via proxy (backend envia para R2) — fallback quando Worker falha
router.post('/photos/:photoId/replace-proxy', protectUser, (req, res, next) => {
  uploadMem.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Arquivo muito grande (limite 30MB).' });
    }
    return res.status(400).json({ success: false, message: err.message || 'Falha ao processar upload.' });
  });
}, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).json({ message: 'photoId inválido' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'Arquivo é obrigatório' });
  if (!KS_WORKER_SECRET) return res.status(501).json({ message: 'Worker não configurado' });

  const userId = req.user.userId;
  const originalName = ((req.body && req.body.original_name) || req.file.originalname || 'foto').toString().slice(0, 500);

  const client = await db.pool.connect();
  try {
    const cur = await client.query(
      `SELECT p.id, p.gallery_id FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!cur.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const galleryId = cur.rows[0].gallery_id;

    const out = await uploadBufferToWorker({
      buffer: req.file.buffer,
      filename: req.file.originalname || 'foto.jpg',
      mimetype: req.file.mimetype || 'application/octet-stream',
      galleryId,
      userId
    });

    await client.query(
      'UPDATE king_photos SET file_path=$1, original_name=$2 WHERE id=$3',
      [`r2:${out.key}`, originalName, photoId]
    );
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

// ===== Marca d'água: upload para R2 (substitui Cloudflare Images)
router.post('/galleries/:id/watermark', protectUser, (req, res, next) => {
  uploadMem.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Arquivo muito grande (limite 30MB).' });
    }
    return res.status(400).json({ success: false, message: err.message || 'Falha ao processar upload.' });
  });
}, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'Arquivo é obrigatório' });
  if (!KS_WORKER_SECRET) return res.status(501).json({ message: 'Worker não configurado' });

  const userId = req.user.userId;
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    let key;
    try {
      const out = await uploadBufferToWorker({
        buffer: req.file.buffer,
        filename: req.file.originalname || 'watermark.png',
        mimetype: req.file.mimetype || 'application/octet-stream',
        galleryId,
        userId
      });
      key = out.key;
    } catch (e) {
      const msg = (e?.message || 'Falha ao enviar marca d\'água para o R2').toString().slice(0, 250);
      return res.status(502).json({ success: false, message: msg });
    }

    const sets = ['watermark_path=$1'];
    const vals = [`r2:${key}`, galleryId];
    if (await hasColumn(client, 'king_galleries', 'watermark_mode')) {
      sets.push('watermark_mode=$3');
      vals.push('logo');
    }
    await client.query(
      `UPDATE king_galleries SET ${sets.join(', ')} WHERE id=$2`,
      vals
    );
    res.json({ success: true, watermark_path: `r2:${key}` });
  } finally {
    client.release();
  }
}));

// ===== Imagem de destaque da página de obrigado (upload de logo)
router.post('/galleries/:id/thank-you-image', protectUser, (req, res, next) => {
  uploadMem.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Arquivo muito grande (limite 30MB).' });
    }
    return res.status(400).json({ success: false, message: err.message || 'Falha ao processar upload.' });
  });
}, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'Arquivo é obrigatório' });
  if (!KS_WORKER_SECRET) return res.status(501).json({ success: false, message: 'Worker não configurado' });

  const userId = req.user.userId;
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    const filename = (req.file.originalname || 'thank-you-image.png').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    let key;
    try {
      const out = await uploadBufferToWorker({
        buffer: req.file.buffer,
        filename: `thank-you-${filename}`,
        mimetype: req.file.mimetype || 'image/png',
        galleryId,
        userId
      });
      key = out.key;
    } catch (e) {
      const msg = (e?.message || 'Falha ao enviar imagem para o R2').toString().slice(0, 250);
      return res.status(502).json({ success: false, message: msg });
    }

    const publicUrl = r2PublicUrl(key) || null;
    const hasThankYou = await hasColumn(client, 'king_galleries', 'thank_you_image_url');
    if (hasThankYou) {
      await client.query(
        'UPDATE king_galleries SET thank_you_image_url=$1, updated_at=NOW() WHERE id=$2',
        [publicUrl, galleryId]
      );
    }
    res.json({ success: true, thank_you_image_url: publicUrl });
  } finally {
    client.release();
  }
}));

// ===== Worker: registrar fotos no banco (com recibo assinado pelo Worker) =====
router.post('/galleries/:id/photos/worker-commit', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ success: false, message: 'galleryId inválido' });
  if (!KS_WORKER_SECRET) return res.status(501).json({ success: false, message: 'Worker não configurado (KINGSELECTION_WORKER_SECRET).' });

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ success: false, message: 'items é obrigatório' });
  if (items.length > 200) return res.status(400).json({ success: false, message: 'Máximo de 200 itens por chamada.' });

  const userId = req.user.userId;
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2
       LIMIT 1`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ success: false, message: 'Sem permissão' });

    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    let validFolderIds = new Set();
    if (hasFolderId && (await hasTable(client, 'king_photo_folders'))) {
      const fr = await client.query('SELECT id FROM king_photo_folders WHERE gallery_id=$1', [galleryId]);
      validFolderIds = new Set((fr.rows || []).map((r) => parseInt(r.id, 10)).filter(Boolean));
    }

    const values = [];
    const rows = [];
    let i = 1;

    for (const it of items) {
      const key = String(it?.key || '').replace(/^\/+/, '').trim();
      const receipt = String(it?.receipt || '').trim();
      const name = String(it?.name || '').slice(0, 500) || 'foto';
      const order = parseInt(it?.order || 0, 10) || 0;
      const folderIdRaw = toPosIntOrNull(it?.folder_id ?? it?.folderId);
      const folderId = (folderIdRaw && validFolderIds.has(folderIdRaw)) ? folderIdRaw : null;

      if (!key || !receipt) continue;
      if (!key.startsWith(`galleries/${galleryId}/`)) continue;

      const payload = ksVerifyToken(receipt);
      if (!payload || payload.typ !== 'ks_receipt') continue;
      if (parseInt(payload.galleryId || 0, 10) !== galleryId) continue;
      if (String(payload.key || '') !== key) continue;

      if (hasFolderId) {
        rows.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
        values.push(galleryId, `r2:${key}`, name, order, folderId);
      } else {
        rows.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
        values.push(galleryId, `r2:${key}`, name, order);
      }
    }

    if (!rows.length) return res.status(400).json({ success: false, message: 'Nenhum item válido (recibo/key inválidos).' });

    const ins = await client.query(
      hasFolderId
        ? `INSERT INTO king_photos (gallery_id, file_path, original_name, "order", folder_id)
           VALUES ${rows.join(',')}
           RETURNING id, gallery_id, original_name, "order", file_path, folder_id`
        : `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
           VALUES ${rows.join(',')}
           RETURNING id, gallery_id, original_name, "order", file_path`,
      values
    );
    scheduleFaceProcessingForNewPhotos(galleryId, ins.rows);
    res.status(201).json({ success: true, photos: ins.rows });
  } finally {
    client.release();
  }
}));

// ===== R2: registrar fotos em lote no banco =====
router.post('/galleries/:id/photos/batch', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { images } = req.body || {};
  const list = Array.isArray(images) ? images : [];
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!list.length) return res.status(400).json({ message: 'images é obrigatório' });
  if (list.length > 200) return res.status(400).json({ message: 'Máximo de 200 imagens por chamada.' });

  const userId = req.user.userId;
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2
       LIMIT 1`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    let validFolderIds = new Set();
    if (hasFolderId && (await hasTable(client, 'king_photo_folders'))) {
      const fr = await client.query('SELECT id FROM king_photo_folders WHERE gallery_id=$1', [galleryId]);
      validFolderIds = new Set((fr.rows || []).map((r) => parseInt(r.id, 10)).filter(Boolean));
    }

    // Inserir em batch (file_path=r2:<key>)
    const values = [];
    const rows = [];
    let i = 1;
    for (const img of list) {
      const key = String(img.key || '').replace(/^\/+/, '').trim();
      if (!key) continue;
      const originalName = String(img.name || '').slice(0, 500) || 'foto';
      const order = parseInt(img.order || 0, 10) || 0;
      const folderIdRaw = toPosIntOrNull(img.folder_id ?? img.folderId);
      const folderId = (folderIdRaw && validFolderIds.has(folderIdRaw)) ? folderIdRaw : null;
      if (hasFolderId) {
        rows.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
        values.push(galleryId, `r2:${key}`, originalName, order, folderId);
      } else {
        rows.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
        values.push(galleryId, `r2:${key}`, originalName, order);
      }
    }
    if (!rows.length) return res.status(400).json({ message: 'Nenhuma imagem válida.' });

    const ins = await client.query(
      hasFolderId
        ? `INSERT INTO king_photos (gallery_id, file_path, original_name, "order", folder_id)
           VALUES ${rows.join(',')}
           RETURNING id, gallery_id, original_name, "order", file_path, folder_id`
        : `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
           VALUES ${rows.join(',')}
           RETURNING id, gallery_id, original_name, "order", file_path`,
      values
    );

    scheduleFaceProcessingForNewPhotos(galleryId, ins.rows);
    res.status(201).json({ success: true, photos: ins.rows });
  } finally {
    client.release();
  }
}));

// ===== Admin: baixar/visualizar arquivo da marca d'água (logo) =====
router.get('/galleries/:id/watermark-file', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).send('galleryId inválido');
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT g.watermark_path
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (!gRes.rows.length) return res.status(404).send('Galeria não encontrada');
    const fp = String(gRes.rows[0].watermark_path || '');
    let buf = null;
    if (fp.toLowerCase().startsWith('r2:')) {
      buf = await fetchPhotoFileBufferFromFilePath(fp);
    }
    if (!buf && fp.startsWith('cfimage:')) {
      const imageId = fp.replace('cfimage:', '').trim();
      buf = await fetchCloudflareImageBuffer(imageId);
    }
    // fallback para a marca d'água padrão do sistema
    if (!buf) buf = await fetchDefaultWatermarkAssetBuffer();
    if (!buf) return res.status(500).send('Não foi possível carregar a marca d’água (Cloudflare/token ou arquivo padrão).');
    const out = await sharp(buf).rotate().resize(560, 560, { fit: 'inside' }).png().toBuffer();
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.send(out);
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/reset-password', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { senha } = req.body || {};
  if (!galleryId || !senha) return res.status(400).json({ message: 'galleryId e senha são obrigatórios' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const g = await client.query(
      `SELECT g.*
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (g.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    const senha_hash = await bcrypt.hash(String(senha), 10);
    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    if (hasEnc) {
      const senha_enc = encryptPassword(String(senha));
      await client.query('UPDATE king_galleries SET senha_hash=$1, senha_enc=$2, updated_at=NOW() WHERE id=$3', [senha_hash, senha_enc, galleryId]);
    } else {
      await client.query('UPDATE king_galleries SET senha_hash=$1, updated_at=NOW() WHERE id=$2', [senha_hash, galleryId]);
    }
    res.json({ success: true, client_password: String(senha) });
  } finally {
    client.release();
  }
}));

// Página HTML para configurar a tela de finalização (obrigado) — lógica atual Node + front
router.get('/config-finalizacao/:galleryId', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  if (!galleryId) return res.status(400).send('galleryId inválido');
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT g.id, g.nome_projeto
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (gRes.rows.length === 0) return res.status(404).send('Galeria não encontrada.');
    res.render('kingSelectionConfigFinalizacao', {
      galleryId,
      nomeProjeto: gRes.rows[0].nome_projeto,
      apiBase: '/api/king-selection'
    });
  } finally {
    client.release();
  }
}));

async function ksLoadGallerySalesConfig(pgClient, galleryId) {
  const hasPixEnabled = await hasColumn(pgClient, 'king_galleries', 'pix_enabled');
  const hasPixKey = await hasColumn(pgClient, 'king_galleries', 'pix_key');
  const hasPixHolder = await hasColumn(pgClient, 'king_galleries', 'pix_holder_name');
  const hasPixInstructions = await hasColumn(pgClient, 'king_galleries', 'pix_instructions');
  const hasOverLimit = await hasColumn(pgClient, 'king_galleries', 'sales_over_limit_policy');
  const hasPriceMode = await hasColumn(pgClient, 'king_galleries', 'sales_price_mode');
  const hasUnit = await hasColumn(pgClient, 'king_galleries', 'sales_unit_price_cents');
  const cols = ['id']
    .concat(hasPixEnabled ? ['pix_enabled'] : [])
    .concat(hasPixKey ? ['pix_key'] : [])
    .concat(hasPixHolder ? ['pix_holder_name'] : [])
    .concat(hasPixInstructions ? ['pix_instructions'] : [])
    .concat(hasOverLimit ? ['sales_over_limit_policy'] : [])
    .concat(hasPriceMode ? ['sales_price_mode'] : [])
    .concat(hasUnit ? ['sales_unit_price_cents'] : []);
  const row = (await pgClient.query(`SELECT ${cols.join(', ')} FROM king_galleries WHERE id=$1`, [galleryId])).rows?.[0] || {};
  return {
    pix_enabled: hasPixEnabled ? !!row.pix_enabled : false,
    pix_key: hasPixKey ? (row.pix_key || null) : null,
    pix_holder_name: hasPixHolder ? (row.pix_holder_name || null) : null,
    pix_instructions: hasPixInstructions ? (row.pix_instructions || null) : null,
    sales_over_limit_policy: hasOverLimit ? ksNormalizeOverLimitPolicy(row.sales_over_limit_policy) : 'allow_and_warn',
    sales_price_mode: hasPriceMode ? ksNormalizePriceMode(row.sales_price_mode) : 'best_price_auto',
    sales_unit_price_cents: hasUnit ? Math.max(0, parseInt(row.sales_unit_price_cents, 10) || 0) : 0
  };
}

async function ksGetPaymentByClientRound(pgClient, galleryId, clientId, selectionBatch) {
  if (!(await hasTable(pgClient, 'king_client_payment_requests'))) return null;
  const r = await pgClient.query(
    `SELECT id, status, payment_method, amount_cents, proof_file_path, note_client, note_admin, reviewed_at, created_at
     FROM king_client_payment_requests
     WHERE gallery_id=$1 AND client_id=$2 AND selection_batch=$3
     LIMIT 1`,
    [galleryId, clientId, selectionBatch]
  );
  if (!r.rows.length) return null;
  const row = r.rows[0];
  return {
    id: parseInt(row.id, 10) || 0,
    status: ksNormPaymentStatus(row.status),
    payment_method: String(row.payment_method || 'pix'),
    amount_cents: row.amount_cents != null ? Math.max(0, parseInt(row.amount_cents, 10) || 0) : null,
    proof_file_path: row.proof_file_path || null,
    note_client: row.note_client || null,
    note_admin: row.note_admin || null,
    reviewed_at: row.reviewed_at || null,
    created_at: row.created_at || null
  };
}

async function ksListApprovalsByClientRound(pgClient, galleryId, clientId, selectionBatch) {
  if (!(await hasTable(pgClient, 'king_selection_photo_approvals'))) return [];
  const rows = (await pgClient.query(
    `SELECT a.id, a.photo_id, a.status, a.delivery_mode, a.decided_at, p.original_name, p."order"
     FROM king_selection_photo_approvals a
     JOIN king_photos p ON p.id = a.photo_id AND p.gallery_id = a.gallery_id
     WHERE a.gallery_id=$1 AND a.client_id=$2 AND a.selection_batch=$3
     ORDER BY p."order" ASC, p.id ASC`,
    [galleryId, clientId, selectionBatch]
  )).rows || [];
  return rows.map((r) => ({
    id: parseInt(r.id, 10) || 0,
    photo_id: parseInt(r.photo_id, 10) || 0,
    status: String(r.status || 'pending').toLowerCase(),
    delivery_mode: ksNormDeliveryMode(r.delivery_mode),
    decided_at: r.decided_at || null,
    original_name: r.original_name || null,
    order: parseInt(r.order, 10) || 0
  }));
}

router.get('/galleries/:id', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const focusClientId = parseInt(req.query.focusClientId || req.query.clientId || '', 10);
  let focusCid = Number.isFinite(focusClientId) && focusClientId > 0 ? focusClientId : null;
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT g.*
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    // Clientes (multi-client) — incluir status por cliente para o painel habilitar Reativar quando o cliente está em revisão
    let clients = [];
    if (await hasTable(client, 'king_gallery_clients')) {
      const hasClientStatus = await hasColumn(client, 'king_gallery_clients', 'status');
      const hasClientRound = await hasColumn(client, 'king_gallery_clients', 'selection_round');
      const hasClientFb = await hasColumn(client, 'king_gallery_clients', 'feedback_cliente');
      const clientCols = ['id', 'nome', 'email', 'telefone', 'enabled', 'note', 'created_at']
        .concat(hasClientStatus ? ['status'] : [])
        .concat(hasClientRound ? ['selection_round'] : [])
        .concat(hasClientFb ? ['feedback_cliente'] : []);
      const cRes = await client.query(
        `SELECT ${clientCols.join(', ')}
         FROM king_gallery_clients
         WHERE gallery_id=$1
         ORDER BY created_at ASC, id ASC`,
        [galleryId]
      );
      clients = (cRes.rows || []).filter((row) => !isTechnicalFaceGalleryClientEmail(row.email));
    }

    const hasSelClientIdEarly = await hasColumn(client, 'king_selections', 'client_id');
    if (!focusCid && clients.length > 1 && hasSelClientIdEarly) {
      const firstId = parseInt(clients[0].id, 10);
      if (Number.isFinite(firstId) && firstId > 0) focusCid = firstId;
    }

    const hasFav = await hasColumn(client, 'king_photos', 'is_favorite');
    const hasCover = await hasColumn(client, 'king_photos', 'is_cover');
    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    const cols = [
      'id',
      'gallery_id',
      'original_name',
      '"order"',
      'created_at',
      hasFav ? 'is_favorite' : 'FALSE AS is_favorite',
      hasCover ? 'is_cover' : 'FALSE AS is_cover',
      hasFolderId ? 'folder_id' : 'NULL::INTEGER AS folder_id'
    ];
    const pRes = await client.query(
      `SELECT ${cols.join(', ')}
       FROM king_photos
       WHERE gallery_id=$1
       ORDER BY "order" ASC, id ASC`,
      [galleryId]
    );
    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const selCols = ['photo_id', 'feedback_cliente', 'created_at']
      .concat(hasSelClientId ? ['client_id'] : [])
      .concat(hasSelBatch ? ['selection_batch'] : []);
    const sRes = await client.query(
      `SELECT ${selCols.join(', ')}
       FROM king_selections
       WHERE gallery_id=$1
       ORDER BY created_at ASC`,
      [galleryId]
    );
    const rowsAll = sRes.rows || [];
    const onlyClient = clients.length === 1 ? clients[0] : null;
    const onlyClientId = onlyClient ? parseInt(onlyClient.id, 10) : null;
    let filteredSelRows = rowsAll;
    if (focusCid && hasSelClientId) {
      const allowed = new Set((clients || []).map(c => parseInt(c.id, 10)).filter(Boolean));
      if (allowed.has(focusCid)) {
        filteredSelRows = rowsAll.filter(r => parseInt(r.client_id, 10) === focusCid);
      }
    } else if (onlyClientId && hasSelClientId) {
      filteredSelRows = rowsAll.filter(r => r.client_id == null || parseInt(r.client_id, 10) === onlyClientId);
    }
    const selectedPhotoIds = filteredSelRows.map(r => r.photo_id);
    let feedback = filteredSelRows.find(r => r.feedback_cliente)?.feedback_cliente || null;
    const focusRow = focusCid ? clients.find(c => parseInt(c.id, 10) === focusCid) : onlyClient;
    if (focusRow && focusRow.feedback_cliente != null && String(focusRow.feedback_cliente).trim()) {
      feedback = focusRow.feedback_cliente;
    }
    const selectionBatchByPhotoId = {};
    const selectionRoundsSummary = {};
    for (const r of filteredSelRows) {
      const pid = r.photo_id;
      const b = hasSelBatch ? (parseInt(r.selection_batch, 10) || 1) : 1;
      selectionBatchByPhotoId[pid] = b;
      const key = String(b);
      selectionRoundsSummary[key] = (selectionRoundsSummary[key] || 0) + 1;
    }
    const shareBaseUrl = (config.urls && config.urls.shareBase) ? config.urls.shareBase.toString().trim().replace(/\/$/, '') : null;
    const statusSummary = aggregateGalleryStatusFromClientRows(clients);
    const folders = await listFoldersForGallery(client, galleryId);
    res.json({
      success: true,
      share_base_url: shareBaseUrl || undefined,
      focus_client_id: focusCid || undefined,
      gallery: {
        ...g,
        status: statusSummary != null ? statusSummary : g.status,
        photos: pRes.rows,
        selectedPhotoIds,
        feedback_cliente: feedback,
        clients,
        folders,
        selectionBatchByPhotoId,
        selectionRoundsSummary
      }
    });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id/sales-config', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id, g.access_mode
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const salesConfig = await ksLoadGallerySalesConfig(client, galleryId);
    const packages = await ksListSalePackages(client, galleryId);
    res.json({
      success: true,
      access_mode: ksNormAccessMode(own.rows[0].access_mode),
      salesConfig,
      packages
    });
  } finally {
    client.release();
  }
}));

router.put('/galleries/:id/sales-config', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const body = req.body || {};
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    const hasPixEnabled = await hasColumn(client, 'king_galleries', 'pix_enabled');
    const hasPixKey = await hasColumn(client, 'king_galleries', 'pix_key');
    const hasPixHolder = await hasColumn(client, 'king_galleries', 'pix_holder_name');
    const hasPixInstructions = await hasColumn(client, 'king_galleries', 'pix_instructions');
    const hasOverLimit = await hasColumn(client, 'king_galleries', 'sales_over_limit_policy');
    const hasPriceMode = await hasColumn(client, 'king_galleries', 'sales_price_mode');
    const hasUnit = await hasColumn(client, 'king_galleries', 'sales_unit_price_cents');

    const sets = [];
    const vals = [];
    let p = 1;
    if (hasPixEnabled && Object.prototype.hasOwnProperty.call(body, 'pix_enabled')) {
      sets.push(`pix_enabled=$${p++}`);
      vals.push(!!body.pix_enabled);
    }
    if (hasPixKey && Object.prototype.hasOwnProperty.call(body, 'pix_key')) {
      const v = body.pix_key == null ? null : String(body.pix_key).trim().slice(0, 255);
      sets.push(`pix_key=$${p++}`);
      vals.push(v || null);
    }
    if (hasPixHolder && Object.prototype.hasOwnProperty.call(body, 'pix_holder_name')) {
      const v = body.pix_holder_name == null ? null : String(body.pix_holder_name).trim().slice(0, 255);
      sets.push(`pix_holder_name=$${p++}`);
      vals.push(v || null);
    }
    if (hasPixInstructions && Object.prototype.hasOwnProperty.call(body, 'pix_instructions')) {
      const v = body.pix_instructions == null ? null : String(body.pix_instructions).trim().slice(0, 2000);
      sets.push(`pix_instructions=$${p++}`);
      vals.push(v || null);
    }
    if (hasOverLimit && Object.prototype.hasOwnProperty.call(body, 'sales_over_limit_policy')) {
      sets.push(`sales_over_limit_policy=$${p++}`);
      vals.push(ksNormalizeOverLimitPolicy(body.sales_over_limit_policy));
    }
    if (hasPriceMode && Object.prototype.hasOwnProperty.call(body, 'sales_price_mode')) {
      sets.push(`sales_price_mode=$${p++}`);
      vals.push(ksNormalizePriceMode(body.sales_price_mode));
    }
    if (hasUnit && Object.prototype.hasOwnProperty.call(body, 'sales_unit_price_cents')) {
      sets.push(`sales_unit_price_cents=$${p++}`);
      vals.push(Math.max(0, parseInt(body.sales_unit_price_cents, 10) || 0));
    }
    if (sets.length) {
      vals.push(galleryId);
      await client.query(`UPDATE king_galleries SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${p}`, vals);
    }

    if (await hasTable(client, 'king_gallery_sale_packages')) {
      const list = Array.isArray(body.packages) ? body.packages : null;
      if (list) {
        await client.query('BEGIN');
        try {
          await client.query('DELETE FROM king_gallery_sale_packages WHERE gallery_id=$1', [galleryId]);
          for (let i = 0; i < list.length; i += 1) {
            const it = list[i] || {};
            const qty = Math.max(1, parseInt(it.photo_qty, 10) || 0);
            const cents = Math.max(0, parseInt(it.price_cents, 10) || 0);
            const active = it.active !== false;
            if (!qty || !cents) continue;
            const nm = String(it.name || `${qty} fotos`).trim().slice(0, 120) || `${qty} fotos`;
            await client.query(
              `INSERT INTO king_gallery_sale_packages (gallery_id, name, photo_qty, price_cents, sort_order, active, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
              [galleryId, nm, qty, cents, i + 1, active]
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }
    }

    const salesConfig = await ksLoadGallerySalesConfig(client, galleryId);
    const packages = await ksListSalePackages(client, galleryId);
    res.json({ success: true, salesConfig, packages });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id/sales/clients', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    if (!(await hasTable(client, 'king_gallery_clients'))) return res.json({ success: true, clients: [] });
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const cRows = (await client.query(
      `SELECT id, nome, email, telefone, status, enabled
       FROM king_gallery_clients
       WHERE gallery_id=$1 AND (enabled IS DISTINCT FROM false)
       ORDER BY created_at ASC, id ASC`,
      [galleryId]
    )).rows || [];
    const filteredClients = cRows.filter((row) => !isTechnicalFaceGalleryClientEmail(row.email));

    const sRows = (await client.query(
      `SELECT client_id, ${hasSelBatch ? 'selection_batch' : '1 AS selection_batch'}, COUNT(*)::int AS selected_count
       FROM king_selections
       WHERE gallery_id=$1 AND client_id IS NOT NULL
       GROUP BY client_id, ${hasSelBatch ? 'selection_batch' : '1'}
       ORDER BY client_id ASC, ${hasSelBatch ? 'selection_batch ASC' : '1 ASC'}`,
      [galleryId]
    )).rows || [];
    const paymentRows = (await hasTable(client, 'king_client_payment_requests'))
      ? ((await client.query(
        `SELECT client_id, selection_batch, status
         FROM king_client_payment_requests
         WHERE gallery_id=$1`,
        [galleryId]
      )).rows || [])
      : [];
    const approvalRows = (await hasTable(client, 'king_selection_photo_approvals'))
      ? ((await client.query(
        `SELECT client_id, selection_batch, COUNT(*)::int AS approved_count
         FROM king_selection_photo_approvals
         WHERE gallery_id=$1 AND lower(status)='approved'
         GROUP BY client_id, selection_batch`,
        [galleryId]
      )).rows || [])
      : [];

    const payMap = new Map(paymentRows.map((r) => [`${r.client_id}:${r.selection_batch}`, ksNormPaymentStatus(r.status)]));
    const apMap = new Map(approvalRows.map((r) => [`${r.client_id}:${r.selection_batch}`, parseInt(r.approved_count, 10) || 0]));
    const roundsByClient = new Map();
    for (const s of sRows) {
      const cid = parseInt(s.client_id, 10) || 0;
      const b = Math.max(1, parseInt(s.selection_batch, 10) || 1);
      const key = `${cid}:${b}`;
      if (!roundsByClient.has(cid)) roundsByClient.set(cid, []);
      roundsByClient.get(cid).push({
        selection_batch: b,
        selected_count: parseInt(s.selected_count, 10) || 0,
        payment_status: payMap.get(key) || 'pending',
        approved_count: apMap.get(key) || 0
      });
    }

    const out = filteredClients.map((c) => ({
      ...c,
      rounds: roundsByClient.get(parseInt(c.id, 10) || 0) || []
    }));
    res.json({ success: true, clients: out });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id/sales/clients/:clientId/round/:selectionBatch', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  const selectionBatch = Math.max(1, parseInt(req.params.selectionBatch, 10) || 1);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'IDs inválidos' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const selectedRows = (await client.query(
      `SELECT s.photo_id, p.original_name, p."order"
       FROM king_selections s
       JOIN king_photos p ON p.id=s.photo_id AND p.gallery_id=s.gallery_id
       WHERE s.gallery_id=$1 AND s.client_id=$2 ${hasSelBatch ? 'AND s.selection_batch=$3' : ''}
       ORDER BY p."order" ASC, p.id ASC`,
      hasSelBatch ? [galleryId, clientId, selectionBatch] : [galleryId, clientId]
    )).rows || [];
    const payment = await ksGetPaymentByClientRound(client, galleryId, clientId, selectionBatch);
    const approvals = await ksListApprovalsByClientRound(client, galleryId, clientId, selectionBatch);
    res.json({
      success: true,
      selected: selectedRows.map((r) => ({
        photo_id: parseInt(r.photo_id, 10) || 0,
        original_name: r.original_name || '',
        order: parseInt(r.order, 10) || 0
      })),
      payment,
      approvals
    });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/sales/clients/:clientId/round/:selectionBatch/payment-review', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  const selectionBatch = Math.max(1, parseInt(req.params.selectionBatch, 10) || 1);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'IDs inválidos' });
  const nextStatusRaw = String(req.body?.status || '').toLowerCase().trim();
  const nextStatus = nextStatusRaw === 'confirmed' ? 'confirmed' : (nextStatusRaw === 'rejected' ? 'rejected' : null);
  if (!nextStatus) return res.status(400).json({ message: 'Status inválido. Use confirmed/rejected.' });
  const noteAdmin = req.body?.note_admin != null ? String(req.body.note_admin).trim().slice(0, 1000) : null;
  const amountCents = req.body?.amount_cents != null ? Math.max(0, parseInt(req.body.amount_cents, 10) || 0) : null;
  const dbClient = await db.pool.connect();
  try {
    const own = await dbClient.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(dbClient, 'king_client_payment_requests'))) {
      return res.status(503).json({ message: 'Tabela de pagamentos indisponível. Execute a migration 208.' });
    }
    await dbClient.query(
      `INSERT INTO king_client_payment_requests
         (gallery_id, client_id, selection_batch, payment_method, status, amount_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
       VALUES ($1,$2,$3,'pix',$4,$5,$6,$7,NOW(),NOW(),NOW())
       ON CONFLICT (gallery_id, client_id, selection_batch)
       DO UPDATE SET status=EXCLUDED.status, amount_cents=COALESCE(EXCLUDED.amount_cents, king_client_payment_requests.amount_cents),
                     note_admin=EXCLUDED.note_admin, reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()`,
      [galleryId, clientId, selectionBatch, nextStatus, amountCents, noteAdmin, req.user.userId]
    );
    const payment = await ksGetPaymentByClientRound(dbClient, galleryId, clientId, selectionBatch);
    res.json({ success: true, payment });
  } finally {
    dbClient.release();
  }
}));

router.post('/galleries/:id/sales/clients/:clientId/round/:selectionBatch/approve-photo', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  const selectionBatch = Math.max(1, parseInt(req.params.selectionBatch, 10) || 1);
  const photoId = parseInt(req.body?.photo_id, 10);
  if (!galleryId || !clientId || !photoId) return res.status(400).json({ message: 'IDs inválidos' });
  const status = String(req.body?.status || '').toLowerCase().trim();
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'status inválido (pending/approved/rejected).' });
  }
  const deliveryMode = ksNormDeliveryMode(req.body?.delivery_mode);
  const dbClient = await db.pool.connect();
  try {
    const own = await dbClient.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(dbClient, 'king_selection_photo_approvals'))) {
      return res.status(503).json({ message: 'Tabela de aprovações indisponível. Execute a migration 208.' });
    }
    const hasSelBatch = await hasColumn(dbClient, 'king_selections', 'selection_batch');
    const hasSelection = await dbClient.query(
      `SELECT 1
       FROM king_selections
       WHERE gallery_id=$1 AND client_id=$2 AND photo_id=$3 ${hasSelBatch ? 'AND selection_batch=$4' : ''}
       LIMIT 1`,
      hasSelBatch ? [galleryId, clientId, photoId, selectionBatch] : [galleryId, clientId, photoId]
    );
    if (!hasSelection.rows.length) return res.status(404).json({ message: 'Foto não está selecionada para este cliente/rodada.' });
    await dbClient.query(
      `INSERT INTO king_selection_photo_approvals
         (gallery_id, client_id, selection_batch, photo_id, status, delivery_mode, decided_by_user_id, decided_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),NOW())
       ON CONFLICT (gallery_id, client_id, selection_batch, photo_id)
       DO UPDATE SET status=EXCLUDED.status, delivery_mode=EXCLUDED.delivery_mode,
                     decided_by_user_id=EXCLUDED.decided_by_user_id, decided_at=NOW(), updated_at=NOW()`,
      [galleryId, clientId, selectionBatch, photoId, status, deliveryMode, req.user.userId]
    );
    const approvals = await ksListApprovalsByClientRound(dbClient, galleryId, clientId, selectionBatch);
    res.json({ success: true, approvals });
  } finally {
    dbClient.release();
  }
}));

router.get('/galleries/:id/sales/payment-proof/:paymentId', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const paymentId = parseInt(req.params.paymentId, 10);
  if (!galleryId || !paymentId) return res.status(400).json({ message: 'IDs inválidos' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_client_payment_requests'))) {
      return res.status(404).json({ message: 'Comprovante não encontrado.' });
    }
    const row = (await client.query(
      `SELECT proof_file_path
       FROM king_client_payment_requests
       WHERE id=$1 AND gallery_id=$2
       LIMIT 1`,
      [paymentId, galleryId]
    )).rows?.[0];
    const filePath = row?.proof_file_path ? path.resolve(String(row.proof_file_path)) : '';
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ message: 'Comprovante não encontrado.' });
    const ext = path.extname(filePath).toLowerCase();
    const ct = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    fs.createReadStream(filePath).pipe(res);
  } finally {
    client.release();
  }
}));

// ===== Admin: pastas (álbuns) =====
router.get('/galleries/:id/folders', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const folders = await listFoldersForGallery(client, galleryId);
    res.json({ success: true, folders });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/folders', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const name = String(req.body?.name || '').trim();
  const sortOrder = parseInt(req.body?.sort_order ?? req.body?.sortOrder ?? 0, 10) || 0;
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!name) return res.status(400).json({ message: 'Nome da pasta é obrigatório' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_photo_folders'))) {
      return res.status(412).json({ message: 'Migrations de pasta ainda não aplicadas no banco.' });
    }
    const safeName = name.slice(0, 120);
    try {
      const ins = await client.query(
        `INSERT INTO king_photo_folders (gallery_id, name, sort_order)
         VALUES ($1,$2,$3)
         RETURNING id, gallery_id, name, sort_order, cover_photo_id, created_at`,
        [galleryId, safeName, sortOrder]
      );
      const folders = await listFoldersForGallery(client, galleryId);
      res.status(201).json({ success: true, folder: ins.rows[0], folders });
    } catch (e) {
      if (e?.code !== '23505') throw e;
      const ex = await client.query(
        'SELECT id, gallery_id, name, sort_order, cover_photo_id, created_at FROM king_photo_folders WHERE gallery_id=$1 AND lower(name)=lower($2) LIMIT 1',
        [galleryId, safeName]
      );
      const folders = await listFoldersForGallery(client, galleryId);
      res.json({ success: true, folder: ex.rows?.[0] || null, folders, alreadyExists: true });
    }
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/folders/generate', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const count = Math.min(200, Math.max(1, parseInt(req.body?.count || 0, 10) || 0));
  const startAt = Math.max(1, parseInt(req.body?.startAt || req.body?.start_at || 1, 10) || 1);
  const prefix = String(req.body?.prefix || 'Pasta').trim() || 'Pasta';
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!count) return res.status(400).json({ message: 'count é obrigatório (1-200)' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_photo_folders'))) {
      return res.status(412).json({ message: 'Migrations de pasta ainda não aplicadas no banco.' });
    }
    const maxRes = await client.query('SELECT COALESCE(MAX(sort_order), 0) AS v FROM king_photo_folders WHERE gallery_id=$1', [galleryId]);
    let sortBase = parseInt(maxRes.rows?.[0]?.v, 10) || 0;
    let created = 0;
    for (let i = 0; i < count; i += 1) {
      const idx = startAt + i;
      const name = `${prefix} ${idx}`.trim().slice(0, 120);
      sortBase += 10;
      // eslint-disable-next-line no-await-in-loop
      try {
        // eslint-disable-next-line no-await-in-loop
        const out = await client.query(
          `INSERT INTO king_photo_folders (gallery_id, name, sort_order)
           VALUES ($1,$2,$3)
           RETURNING id`,
          [galleryId, name, sortBase]
        );
        if (out.rows.length) created += 1;
      } catch (e) {
        if (e?.code !== '23505') throw e;
      }
    }
    const folders = await listFoldersForGallery(client, galleryId);
    res.status(201).json({ success: true, created, folders });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/folders/reorder', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const folderIds = Array.isArray(req.body?.folder_ids)
    ? req.body.folder_ids.map((v) => parseInt(v, 10)).filter(Boolean)
    : [];
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!folderIds.length) return res.status(400).json({ message: 'folder_ids é obrigatório' });

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    const dbFolders = await client.query(
      'SELECT id FROM king_photo_folders WHERE gallery_id=$1 ORDER BY sort_order ASC, id ASC',
      [galleryId]
    );
    const dbIds = dbFolders.rows.map((r) => parseInt(r.id, 10)).filter(Boolean);
    if (!dbIds.length) return res.json({ success: true, folders: [] });

    const seen = new Set();
    const wanted = [];
    for (const id of folderIds) {
      if (!dbIds.includes(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      wanted.push(id);
    }
    for (const id of dbIds) {
      if (!seen.has(id)) wanted.push(id);
    }

    await client.query('BEGIN');
    try {
      let sort = 10;
      for (const id of wanted) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          'UPDATE king_photo_folders SET sort_order=$1, updated_at=NOW() WHERE gallery_id=$2 AND id=$3',
          [sort, galleryId, id]
        );
        sort += 10;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    const folders = await listFoldersForGallery(client, galleryId);
    res.json({ success: true, folders });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/folders/auto-separate-by-face', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const minSimilarity = Math.max(45, Math.min(99, parseFloat(req.body?.minSimilarity ?? 72) || 72));
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const out = await runAutoSeparateByFaceInternal(client, galleryId, minSimilarity);
    res.json({
      success: true,
      updated: out.updated || 0,
      folders: out.folders || [],
      assignments: out.assignments || [],
      message: out.message || undefined
    });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/folders/auto-separate-job/start', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const minSimilarity = Math.max(45, Math.min(99, parseFloat(req.body?.minSimilarity ?? 72) || 72));
  const forceReprocess = req.body?.forceReprocess === true;
  const concurrency = Math.min(8, Math.max(1, parseInt(req.body?.concurrency || '5', 10) || 5));
  const speedMode = String(req.body?.speedMode || process.env.REKOG_SPEED_MODE_DEFAULT || 'auto').trim().toLowerCase();
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_folder_auto_jobs'))) {
      return res.status(412).json({ message: 'Tabela king_folder_auto_jobs não encontrada. Execute a migration 207.' });
    }
    const active = await client.query(
      `SELECT id, gallery_id, status, stage, message, min_similarity, force_reprocess,
              total_photos, processed_photos, error_photos, assigned_photos,
              error_message, created_at, started_at, finished_at, updated_at
       FROM king_folder_auto_jobs
       WHERE gallery_id=$1
         AND status IN ('pending','processing')
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [galleryId]
    );
    if (active.rows.length) {
      return res.json({
        success: true,
        message: 'Já existe um job em andamento para esta galeria.',
        job: active.rows[0],
        alreadyRunning: true
      });
    }

    const ins = await client.query(
      `INSERT INTO king_folder_auto_jobs
         (gallery_id, status, stage, message, min_similarity, force_reprocess, options_json)
       VALUES
         ($1,'pending','queued',$2,$3,$4,$5::jsonb)
       RETURNING id, gallery_id, status, stage, message, min_similarity, force_reprocess, total_photos, processed_photos, error_photos, assigned_photos, created_at, started_at, finished_at, updated_at`,
      [
        galleryId,
        'Job enfileirado.',
        minSimilarity,
        forceReprocess,
        JSON.stringify({ speedMode, concurrency })
      ]
    );
    const job = ins.rows[0];

    const updateJob = async (jobId, patch) => {
      const c = await db.pool.connect();
      try {
        const sets = [];
        const vals = [];
        let i = 1;
        const push = (col, val) => { sets.push(`${col}=$${i++}`); vals.push(val); };
        if (Object.prototype.hasOwnProperty.call(patch, 'status')) push('status', patch.status);
        if (Object.prototype.hasOwnProperty.call(patch, 'stage')) push('stage', patch.stage);
        if (Object.prototype.hasOwnProperty.call(patch, 'message')) push('message', patch.message);
        if (Object.prototype.hasOwnProperty.call(patch, 'total_photos')) push('total_photos', patch.total_photos);
        if (Object.prototype.hasOwnProperty.call(patch, 'processed_photos')) push('processed_photos', patch.processed_photos);
        if (Object.prototype.hasOwnProperty.call(patch, 'error_photos')) push('error_photos', patch.error_photos);
        if (Object.prototype.hasOwnProperty.call(patch, 'assigned_photos')) push('assigned_photos', patch.assigned_photos);
        if (Object.prototype.hasOwnProperty.call(patch, 'error_message')) push('error_message', patch.error_message);
        if (Object.prototype.hasOwnProperty.call(patch, 'started_at')) sets.push(`started_at=${patch.started_at ? 'NOW()' : 'NULL'}`);
        if (Object.prototype.hasOwnProperty.call(patch, 'finished_at')) sets.push(`finished_at=${patch.finished_at ? 'NOW()' : 'NULL'}`);
        if (!sets.length) return true;
        vals.push(jobId);
        const out = await c.query(
          `UPDATE king_folder_auto_jobs
           SET ${sets.join(', ')}, updated_at=NOW()
           WHERE id=$${i} AND status <> 'cancelled'`,
          vals
        );
        return (out.rowCount || 0) > 0;
      } finally {
        c.release();
      }
    };

    const isJobCancelled = async (jobId) => {
      const c = await db.pool.connect();
      try {
        const q = await c.query('SELECT status FROM king_folder_auto_jobs WHERE id=$1 LIMIT 1', [jobId]);
        return String(q.rows?.[0]?.status || '').toLowerCase() === 'cancelled';
      } finally {
        c.release();
      }
    };

    setImmediate(async () => {
      try {
        const canStart = await updateJob(job.id, {
          status: 'processing',
          stage: 'processing_faces',
          message: 'Processando reconhecimento facial em segundo plano...',
          started_at: true
        });
        if (!canStart) return;

        const cList = await db.pool.connect();
        let photos = [];
        try {
          if (forceReprocess) {
            const q = await cList.query(
              'SELECT id, file_path FROM king_photos WHERE gallery_id=$1 ORDER BY id',
              [galleryId]
            );
            photos = q.rows || [];
          } else {
            const q = await cList.query(
              `SELECT kp.id, kp.file_path
               FROM king_photos kp
               LEFT JOIN rekognition_photo_jobs rpj ON rpj.photo_id = kp.id AND rpj.gallery_id = kp.gallery_id
               WHERE kp.gallery_id=$1
                 AND (rpj.process_status IS NULL OR rpj.process_status NOT IN ('done'))
               ORDER BY kp.id`,
              [galleryId]
            );
            photos = q.rows || [];
          }
        } finally {
          cList.release();
        }

        if (await isJobCancelled(job.id)) return;
        await updateJob(job.id, {
          total_photos: photos.length,
          message: photos.length
            ? `Reconhecimento em andamento (${photos.length} foto(s) na fila).`
            : 'Nenhuma foto pendente de processamento facial. Indo para separação por pastas.'
        });

        let faceOut = { processed: 0, errors: 0 };
        if (photos.length) {
          faceOut = await runGalleryPhotosThroughRekognition(galleryId, photos, concurrency, { speedMode });
        }

        if (await isJobCancelled(job.id)) return;
        await updateJob(job.id, {
          processed_photos: parseInt(faceOut.processed, 10) || 0,
          error_photos: parseInt(faceOut.errors, 10) || 0,
          stage: 'separating_folders',
          message: 'Separando fotos por pastas automaticamente...'
        });

        const cSep = await db.pool.connect();
        let sepOut = null;
        try {
          sepOut = await runAutoSeparateByFaceInternal(cSep, galleryId, minSimilarity);
        } finally {
          cSep.release();
        }

        if (await isJobCancelled(job.id)) return;
        await updateJob(job.id, {
          status: 'done',
          stage: 'done',
          assigned_photos: parseInt(sepOut?.updated, 10) || 0,
          message: sepOut?.message || `Concluído. ${parseInt(sepOut?.updated, 10) || 0} foto(s) separadas em pastas.`,
          finished_at: true
        });
      } catch (err) {
        const msg = (err?.message || 'Falha no processamento do job').toString().slice(0, 500);
        try {
          await updateJob(job.id, {
            status: 'error',
            stage: 'error',
            error_message: msg,
            message: msg,
            finished_at: true
          });
        } catch (_) { }
      }
    });

    return res.json({
      success: true,
      message: 'Job de separação por pastas iniciado em segundo plano.',
      job
    });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id/folders/auto-separate-job', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_folder_auto_jobs'))) {
      return res.json({ success: true, job: null });
    }
    const jr = await client.query(
      `SELECT id, gallery_id, status, stage, message, min_similarity, force_reprocess,
              total_photos, processed_photos, error_photos, assigned_photos,
              error_message, created_at, started_at, finished_at, updated_at
       FROM king_folder_auto_jobs
       WHERE gallery_id=$1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [galleryId]
    );
    return res.json({ success: true, job: jr.rows?.[0] || null });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id/folders/auto-separate-jobs', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const limit = Math.min(50, Math.max(1, parseInt(req.query?.limit || '20', 10) || 20));
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_folder_auto_jobs'))) {
      return res.json({ success: true, jobs: [] });
    }
    const jr = await client.query(
      `SELECT id, gallery_id, status, stage, message, min_similarity, force_reprocess,
              total_photos, processed_photos, error_photos, assigned_photos,
              error_message, created_at, started_at, finished_at, updated_at
       FROM king_folder_auto_jobs
       WHERE gallery_id=$1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [galleryId, limit]
    );
    return res.json({ success: true, jobs: jr.rows || [] });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/folders/auto-separate-job/:jobId/cancel', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const jobId = parseInt(req.params.jobId, 10);
  if (!galleryId || !jobId) return res.status(400).json({ message: 'galleryId/jobId inválidos' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_folder_auto_jobs'))) {
      return res.status(412).json({ message: 'Tabela king_folder_auto_jobs não encontrada. Execute a migration 207.' });
    }
    const up = await client.query(
      `UPDATE king_folder_auto_jobs
       SET status='cancelled', stage='cancelled', message='Job cancelado pelo usuário.', finished_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND gallery_id=$2 AND status IN ('pending','processing')
       RETURNING id, gallery_id, status, stage, message, min_similarity, force_reprocess,
                 total_photos, processed_photos, error_photos, assigned_photos,
                 error_message, created_at, started_at, finished_at, updated_at`,
      [jobId, galleryId]
    );
    if (!up.rows.length) {
      const cur = await client.query(
        `SELECT id, gallery_id, status, stage, message, min_similarity, force_reprocess,
                total_photos, processed_photos, error_photos, assigned_photos,
                error_message, created_at, started_at, finished_at, updated_at
         FROM king_folder_auto_jobs
         WHERE id=$1 AND gallery_id=$2
         LIMIT 1`,
        [jobId, galleryId]
      );
      if (!cur.rows.length) return res.status(404).json({ message: 'Job não encontrado.' });
      return res.json({ success: true, job: cur.rows[0], message: 'Job já finalizado.' });
    }
    return res.json({ success: true, job: up.rows[0], message: 'Job cancelado.' });
  } finally {
    client.release();
  }
}));

router.patch('/galleries/:id/folders/:folderId', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const folderId = parseInt(req.params.folderId, 10);
  if (!galleryId || !folderId) return res.status(400).json({ message: 'galleryId/folderId inválidos' });
  const body = req.body || {};
  const name = body.name != null ? String(body.name || '').trim().slice(0, 120) : undefined;
  const sortOrder = body.sort_order != null || body.sortOrder != null
    ? (parseInt(body.sort_order ?? body.sortOrder, 10) || 0)
    : undefined;
  const coverPhotoIdRaw = (body.cover_photo_id ?? body.coverPhotoId);
  const wantsCoverUpdate = (coverPhotoIdRaw !== undefined);
  const coverPhotoId = toPosIntOrNull(coverPhotoIdRaw);

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const fRes = await client.query(
      'SELECT id FROM king_photo_folders WHERE id=$1 AND gallery_id=$2 LIMIT 1',
      [folderId, galleryId]
    );
    if (!fRes.rows.length) return res.status(404).json({ message: 'Pasta não encontrada' });

    if (wantsCoverUpdate && coverPhotoId) {
      const pRes = await client.query(
        `SELECT id
         FROM king_photos
         WHERE id=$1 AND gallery_id=$2 AND folder_id=$3
         LIMIT 1`,
        [coverPhotoId, galleryId, folderId]
      );
      if (!pRes.rows.length) {
        return res.status(400).json({ message: 'A capa deve ser uma foto dessa pasta.' });
      }
    }

    const sets = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) { sets.push(`name=$${i++}`); vals.push(name || 'Pasta'); }
    if (sortOrder !== undefined) { sets.push(`sort_order=$${i++}`); vals.push(sortOrder); }
    if (wantsCoverUpdate) { sets.push(`cover_photo_id=$${i++}`); vals.push(coverPhotoId); }
    if (!sets.length) return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    vals.push(folderId, galleryId);
    await client.query(
      `UPDATE king_photo_folders
       SET ${sets.join(', ')}, updated_at=NOW()
       WHERE id=$${i++} AND gallery_id=$${i}`,
      vals
    );
    const folders = await listFoldersForGallery(client, galleryId);
    res.json({ success: true, folders });
  } finally {
    client.release();
  }
}));

router.delete('/galleries/:id/folders/:folderId', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const folderId = parseInt(req.params.folderId, 10);
  if (!galleryId || !folderId) return res.status(400).json({ message: 'galleryId/folderId inválidos' });
  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    await client.query('UPDATE king_photos SET folder_id=NULL WHERE gallery_id=$1 AND folder_id=$2', [galleryId, folderId]);
    const del = await client.query('DELETE FROM king_photo_folders WHERE id=$1 AND gallery_id=$2', [folderId, galleryId]);
    if (!del.rowCount) return res.status(404).json({ message: 'Pasta não encontrada' });
    const folders = await listFoldersForGallery(client, galleryId);
    res.json({ success: true, folders });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/photos/assign-folder', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const photoIds = Array.isArray(req.body?.photo_ids) ? req.body.photo_ids.map((v) => parseInt(v, 10)).filter(Boolean) : [];
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!photoIds.length) return res.status(400).json({ message: 'photo_ids é obrigatório' });

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, req.user.userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    if (!hasFolderId) {
      return res.status(412).json({ message: 'Migrations de pasta ainda não aplicadas no banco.' });
    }

    const wantedFolderId = await resolveFolderIdForGallery(client, galleryId, req.body?.folder_id ?? req.body?.folderId);
    const incomingFolder = req.body?.folder_id ?? req.body?.folderId;
    if (incomingFolder != null && incomingFolder !== '' && !wantedFolderId) {
      return res.status(400).json({ message: 'Pasta inválida para esta galeria.' });
    }

    const upd = await client.query(
      `UPDATE king_photos
       SET folder_id=$1
       WHERE gallery_id=$2
         AND id = ANY($3::int[])`,
      [wantedFolderId, galleryId, photoIds]
    );

    if (wantedFolderId) {
      await client.query(
        `UPDATE king_photo_folders f
         SET cover_photo_id = COALESCE(
           f.cover_photo_id,
           (
             SELECT p.id
             FROM king_photos p
             WHERE p.gallery_id = $1
               AND p.folder_id = $2
             ORDER BY p."order" ASC, p.id ASC
             LIMIT 1
           )
         ),
         updated_at = NOW()
         WHERE f.gallery_id = $1
           AND f.id = $2`,
        [galleryId, wantedFolderId]
      );
    }

    const folders = await listFoldersForGallery(client, galleryId);
    res.json({ success: true, updated: upd.rowCount || 0, folders });
  } finally {
    client.release();
  }
}));

// ===== Admin: CRUD de clientes (multi-client) =====
router.get('/galleries/:id/clients', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.json({ success: true, clients: [] });
    }

    const hasSt = await hasColumn(client, 'king_gallery_clients', 'status');
    const hasSr = await hasColumn(client, 'king_gallery_clients', 'selection_round');
    const cols = ['id', 'nome', 'email', 'telefone', 'enabled', 'note', 'created_at']
      .concat(hasSt ? ['status'] : [])
      .concat(hasSr ? ['selection_round'] : []);
    const cRes = await client.query(
      `SELECT ${cols.join(', ')}
       FROM king_gallery_clients
       WHERE gallery_id=$1
       ORDER BY created_at ASC, id ASC`,
      [galleryId]
    );
    const rows = (cRes.rows || []).filter((row) => !isTechnicalFaceGalleryClientEmail(row.email));
    res.json({ success: true, clients: rows });
  } finally {
    client.release();
  }
}));

/** Fotógrafo: remove todas as fotos de uma rodada (selection_batch) de um cliente — útil para apagar testes ou envio errado. */
router.post('/galleries/:id/clients/:clientId/delete-selection-batch', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  const batch = parseInt((req.body || {}).batch, 10);
  if (!galleryId || !clientId || !Number.isFinite(batch) || batch < 1) {
    return res.status(400).json({ message: 'galleryId, clientId e batch (número >= 1) são obrigatórios.' });
  }

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    const ck = await client.query(
      'SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND id=$2 AND enabled=TRUE',
      [galleryId, clientId]
    );
    if (ck.rows.length === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });

    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    if (!hasSelBatch) {
      return res.status(400).json({ message: 'Esta base não tem rodadas de seleção (migration pendente?).' });
    }

    const del = await client.query(
      'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2 AND selection_batch=$3',
      [galleryId, clientId, batch]
    );
    res.json({ success: true, deleted: del.rowCount || 0 });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/clients', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { nome, email, telefone, senha, note } = req.body || {};
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
  if (!nome || !email) return res.status(400).json({ message: 'Informe nome e e-mail.' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível (migração pendente).' });
    }

    const pass = String(senha || Math.floor(100000 + Math.random() * 900000));
    const senha_hash = await bcrypt.hash(pass, 10);
    const senha_enc = encryptPassword(pass);
    const emailNorm = String(email).toLowerCase().trim();
    const telNorm = String(telefone || '').trim();
    const nomeNorm = String(nome || '').trim().slice(0, 255);
    const noteVal = (note == null) ? null : String(note).trim();

    let ins;
    try {
      ins = await client.query(
        `INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, note, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,NOW(),NOW())
         RETURNING id, nome, email, telefone, enabled, created_at`,
        [galleryId, nomeNorm, emailNorm, telNorm || null, senha_hash, senha_enc, noteVal]
      );
    } catch (e) {
      // unique index (gallery_id, lower(email))
      if (String(e.message || '').toLowerCase().includes('uniq_king_gallery_clients_gallery_email')) {
        return res.status(409).json({ message: 'Já existe um cliente com este e-mail nesta galeria.' });
      }
      throw e;
    }

    res.status(201).json({ success: true, client: ins.rows[0], client_password: pass });
  } finally {
    client.release();
  }
}));

router.put('/galleries/:id/clients/:clientId', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'IDs inválidos' });

  const { nome, email, telefone, enabled, note } = req.body || {};

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível (migração pendente).' });
    }

    const sets = [];
    const values = [];
    let idx = 1;
    if (typeof nome !== 'undefined') { sets.push(`nome=$${idx++}`); values.push(String(nome || '').trim().slice(0, 255)); }
    if (typeof email !== 'undefined') { sets.push(`email=$${idx++}`); values.push(String(email || '').toLowerCase().trim()); }
    if (typeof telefone !== 'undefined') { sets.push(`telefone=$${idx++}`); values.push(String(telefone || '').trim() || null); }
    if (typeof enabled !== 'undefined') { sets.push(`enabled=$${idx++}`); values.push(!!enabled); }
    if (typeof note !== 'undefined') { sets.push(`note=$${idx++}`); values.push((note == null) ? null : String(note).trim()); }

    if (!sets.length) return res.json({ success: true });

    values.push(galleryId, clientId);
    await client.query(
      `UPDATE king_gallery_clients
       SET ${sets.join(', ')}, updated_at=NOW()
       WHERE gallery_id=$${idx++} AND id=$${idx}`,
      values
    );
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.delete('/galleries/:id/clients/:clientId', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'IDs inválidos' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível (migração pendente).' });
    }

    // desativa ao invés de deletar (mais seguro)
    await client.query(
      'UPDATE king_gallery_clients SET enabled=FALSE, updated_at=NOW() WHERE gallery_id=$1 AND id=$2',
      [galleryId, clientId]
    );
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/clients/:clientId/reset-password', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  const { senha } = req.body || {};
  if (!galleryId || !clientId || !senha) return res.status(400).json({ message: 'Informe galleryId, clientId e senha.' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível (migração pendente).' });
    }

    const senha_hash = await bcrypt.hash(String(senha), 10);
    const senha_enc = encryptPassword(String(senha));
    await client.query(
      'UPDATE king_gallery_clients SET senha_hash=$1, senha_enc=$2, updated_at=NOW() WHERE gallery_id=$3 AND id=$4',
      [senha_hash, senha_enc, galleryId, clientId]
    );
    res.json({ success: true, client_password: String(senha) });
  } finally {
    client.release();
  }
}));

// ===== Rekognition: cadastro de rosto do cliente (enroll) =====
router.post('/galleries/:id/clients/:clientId/enroll-face', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  const { referenceR2Key } = req.body || {};
  if (!galleryId || !clientId) return res.status(400).json({ message: 'galleryId e clientId são obrigatórios.' });
  const r2Key = extractR2Key(referenceR2Key) || String(referenceR2Key || '').trim().replace(/^\/+/, '');
  if (!r2Key || !r2Key.startsWith('galleries/')) {
    return res.status(400).json({ message: 'referenceR2Key deve ser uma chave R2 válida (ex: galleries/123/ref.jpg).' });
  }
  const stagingCfg = getStagingConfig();
  const rekogCfg = getRekogConfig();
  if (!stagingCfg.enabled || !rekogCfg.enabled) {
    return res.status(503).json({ message: 'Reconhecimento facial não configurado (S3 staging ou Rekognition).' });
  }

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });
    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível.' });
    }
    const clientRow = await client.query(
      'SELECT id FROM king_gallery_clients WHERE gallery_id=$1 AND id=$2 AND enabled=TRUE',
      [galleryId, clientId]
    );
    if (clientRow.rows.length === 0) return res.status(404).json({ message: 'Cliente não encontrado ou desativado.' });

    let buffer = await r2GetObjectViaPublicUrl(r2Key);
    if (!buffer) buffer = await r2GetObjectBuffer(r2Key);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ message: 'Não foi possível obter a imagem do R2. Verifique a chave.' });
    }
    buffer = await normalizeImageForRekognition(buffer);

    const stagingKey = buildStagingKey(String(galleryId), r2Key, 'enroll');
    await putStagingObject(stagingKey, buffer, 'image/jpeg');
    const externalImageId = `g${galleryId}_c${clientId}`;

    let indexResult;
    try {
      indexResult = await indexFacesFromS3(stagingCfg.bucket, stagingKey, externalImageId);
    } finally {
      await deleteStagingObject(stagingKey);
    }

    const faceRecords = indexResult.FaceRecords || [];
    if (faceRecords.length === 0) {
      return res.status(400).json({
        message: 'Nenhum rosto detectado na imagem. Use uma foto com o rosto visível.',
        UnindexedFaces: indexResult.UnindexedFaces || []
      });
    }

    if (!(await hasTable(client, 'rekognition_client_faces'))) {
      return res.json({
        success: true,
        message: 'Rosto indexado no Rekognition. Tabela rekognition_client_faces não existe (rode a migration 181).',
        faceCount: faceRecords.length,
        faceIds: faceRecords.map(r => r.Face?.FaceId).filter(Boolean)
      });
    }

    for (const rec of faceRecords) {
      const faceId = rec.Face?.FaceId;
      const imageId = rec.Face?.ImageId;
      if (!faceId) continue;
      await client.query(
        `INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (gallery_id, client_id, face_id) DO UPDATE SET image_id=EXCLUDED.image_id, reference_r2_key=EXCLUDED.reference_r2_key`,
        [galleryId, clientId, faceId, imageId || null, r2Key]
      );
    }

    res.json({
      success: true,
      message: 'Rosto(s) cadastrado(s) com sucesso.',
      faceCount: faceRecords.length,
      faceIds: faceRecords.map(r => r.Face?.FaceId).filter(Boolean)
    });
  } finally {
    client.release();
  }
}));

// GET /api/king-selection/galleries/:id/enrolled-faces
router.get('/galleries/:id/enrolled-faces', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido.' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    const efRes = await client.query(
      `SELECT DISTINCT client_id FROM rekognition_client_faces WHERE gallery_id=$1`,
      [galleryId]
    );
    res.json({ success: true, clientIds: efRes.rows.map(r => r.client_id) });
  } finally {
    client.release();
  }
}));

router.get('/galleries/:id/clients/:clientId/password', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const clientId = parseInt(req.params.clientId, 10);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'IDs inválidos' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });
    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível (migração pendente).' });
    }
    const cRes = await client.query(
      'SELECT senha_enc FROM king_gallery_clients WHERE gallery_id=$1 AND id=$2',
      [galleryId, clientId]
    );
    const enc = cRes.rows?.[0]?.senha_enc || null;
    const plain = enc ? decryptPassword(enc) : null;
    if (!plain) return res.status(409).json({ message: 'Senha indisponível. Gere uma nova senha em Editar.' });
    res.json({ success: true, password: plain });
  } finally {
    client.release();
  }
}));

router.put('/galleries/:id', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const allowed = [
    'nome_projeto',
    'status',
    'total_fotos_contratadas',
    'min_selections',
    'access_mode',
    'is_published',
    'cliente_nome',
    'cliente_email',
    'cliente_telefone',
    'cliente_nota',
    'allow_self_signup',
    'client_enabled',
    'categoria',
    'data_trabalho',
    'idioma',
    'mensagem_acesso',
    'allow_download',
    'allow_comments',
    'allow_social_sharing',
    'watermark_mode',
    'watermark_path',
    'watermark_opacity',
    'watermark_scale',
    'watermark_rotate',
    'face_recognition_enabled',
    'client_image_quality',
    'pix_enabled',
    'pix_key',
    'pix_holder_name',
    'pix_instructions',
    'sales_over_limit_policy',
    'sales_price_mode',
    'sales_unit_price_cents',
    'thank_you_title',
    'thank_you_message',
    'thank_you_image_url',
    'thank_you_photographer_name'
  ];

  const body = req.body || {};
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });

    invalidateSchemaColumnCache('king_galleries', 'face_recognition_enabled');
    invalidateSchemaColumnCache('king_galleries', 'client_image_quality');

    if (Object.prototype.hasOwnProperty.call(body, 'face_recognition_enabled')) {
      const ok = await hasColumn(client, 'king_galleries', 'face_recognition_enabled');
      if (!ok) {
        return res.status(503).json({
          message: 'O banco não tem a coluna face_recognition_enabled. Execute a migration 182 no Postgres (rekognition).'
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'client_image_quality')) {
      const ok = await hasColumn(client, 'king_galleries', 'client_image_quality');
      if (!ok) {
        return res.status(503).json({
          message: 'O banco não tem client_image_quality. Execute a migration 205 no Postgres.'
        });
      }
    }

    // Se o watermark_path for alterado/removido, deletar o antigo no Cloudflare (evita órfãos).
    const hasWmPathCol = await hasColumn(client, 'king_galleries', 'watermark_path');
    const willTouchWmPath = hasWmPathCol && Object.prototype.hasOwnProperty.call(body, 'watermark_path');
    let oldWmPath = null;
    if (willTouchWmPath) {
      const cur = await client.query('SELECT watermark_path FROM king_galleries WHERE id=$1', [galleryId]);
      oldWmPath = String(cur.rows?.[0]?.watermark_path || '').trim();
    }
    let newWmPath = undefined;

    // montar update apenas com colunas existentes
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;
      const exists = await hasColumn(client, 'king_galleries', key);
      if (!exists) continue;

      let val = body[key];
      if (key === 'total_fotos_contratadas' || key === 'min_selections') val = parseInt(val || 0, 10) || 0;
      if (key === 'is_published' || key === 'allow_download' || key === 'allow_comments' || key === 'allow_social_sharing' || key === 'allow_self_signup' || key === 'client_enabled' || key === 'face_recognition_enabled' || key === 'pix_enabled') val = !!val;
      if (key === 'client_image_quality') val = normalizeClientImageQuality(val);
      if (key === 'access_mode') val = ksNormAccessMode(val);
      if (key === 'sales_over_limit_policy') val = ksNormalizeOverLimitPolicy(val);
      if (key === 'sales_price_mode') val = ksNormalizePriceMode(val);
      if (key === 'sales_unit_price_cents') val = Math.max(0, parseInt(val || 0, 10) || 0);
      if (key === 'pix_key' || key === 'pix_holder_name' || key === 'pix_instructions') {
        if (val === '' || val === 'null' || val == null) val = null;
        else val = String(val).trim().slice(0, key === 'pix_instructions' ? 2000 : 255);
      }
      if (key === 'cliente_email') val = String(val || '').toLowerCase().trim();
      if (key === 'data_trabalho' && val) val = String(val).slice(0, 10);
      if (key === 'watermark_opacity') {
        const n = parseFloat(val);
        val = Number.isFinite(n) ? Math.max(0.0, Math.min(1.0, n)) : 0.15;
        val = Math.round(val * 100) / 100;
      }
      if (key === 'watermark_scale') {
        const n = parseFloat(val);
        val = Number.isFinite(n) ? Math.max(0.10, Math.min(5.0, n)) : 1.19;
        val = Math.round(val * 100) / 100;
      }
      if (key === 'watermark_rotate') {
        const n = parseInt(val || 0, 10) || 0;
        val = [0, 90, 180, 270].includes(n) ? n : 0;
      }
      if (key === 'watermark_path') {
        // normalizar string vazia como NULL
        if (val === '' || val === 'null') val = null;
        newWmPath = val;
      }
      if (key === 'thank_you_title' || key === 'thank_you_message' || key === 'thank_you_image_url') {
        if (val === '' || val === 'null') val = null;
        else if (val != null) val = String(val).trim().slice(0, 2000);
      }
      if (key === 'thank_you_photographer_name') {
        if (val === '' || val === 'null') val = null;
        else if (val != null) val = String(val).trim().slice(0, 255);
      }
      sets.push(`${key}=$${idx++}`);
      values.push(val);
    }

    if (!sets.length) return res.json({ success: true });
    values.push(galleryId);
    try {
      await client.query(`UPDATE king_galleries SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${idx}`, values);
    } catch (err) {
      if (err.code === '23514') {
        return res.status(400).json({
          message: 'Valor de marca d\'água fora do permitido pelo banco. Use opacidade entre 0 e 100% e tamanho entre 10 e 500%. Se já estiver nesse intervalo, execute a migration 151 no Postgres: npm run migrate ou node scripts/run-migration-151.js'
        });
      }
      throw err;
    }

    // Reativação: ao colocar galeria em "andamento", desbloquear todos os clientes (status por cliente)
    if (body.status === 'andamento' && (await hasTable(client, 'king_gallery_clients')) && (await hasColumn(client, 'king_gallery_clients', 'status'))) {
      await client.query('UPDATE king_gallery_clients SET status=$1, updated_at=NOW() WHERE gallery_id=$2', ['andamento', galleryId]);
    }

    // Pós-update: deletar arquivo antigo (Cloudflare Images ou R2) se foi removido/trocado
    const cloudflare = { attempted: false, deleted: false, skipped: false };
    const r2Wm = { attempted: false, deleted: false };
    if (willTouchWmPath && oldWmPath) {
      const next = (newWmPath == null) ? '' : String(newWmPath).trim();
      const changed = !next || next !== oldWmPath;

      const r2Key = extractR2Key(oldWmPath);
      if (r2Key && changed) {
        r2Wm.attempted = true;
        try {
          const stillUsed = await client.query(
            'SELECT 1 FROM king_galleries WHERE watermark_path=$1 AND id<>$2 LIMIT 1',
            [oldWmPath, galleryId]
          );
          if (!stillUsed.rows.length) r2Wm.deleted = await deleteR2ObjectViaWorker(r2Key);
        } catch (_) { }
      }

      if (!r2Key) {
        let oldId = null;
        const low = oldWmPath.toLowerCase();
        if (low.startsWith('cfimage:')) oldId = oldWmPath.slice('cfimage:'.length).trim();
        else {
          const m = oldWmPath.match(/^https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\//i);
          if (m && m[1]) oldId = m[1];
        }
        if (oldId && changed) {
          cloudflare.attempted = true;
          try {
            cloudflare.deleted = await deleteCloudflareImage(oldId);
            if (!cloudflare.deleted) cloudflare.skipped = true;
          } catch (_) {
            cloudflare.skipped = true;
          }
        }
      }
    }

    res.json({ success: true, cloudflare_watermark: cloudflare, r2_watermark: r2Wm });
  } finally {
    client.release();
  }
}));

// ===== Admin export (Lightroom / Windows / Finder) =====
router.get('/galleries/:id/export', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

  const batchParam = (req.query.batch || '').toString().trim();
  const filterBatch = batchParam && batchParam !== 'all' ? parseInt(batchParam, 10) : null;
  const clientIdParam = req.query.clientId != null && String(req.query.clientId).trim() !== ''
    ? parseInt(req.query.clientId, 10)
    : null;

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT g.*
       FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (gRes.rows.length === 0) return res.status(403).json({ message: 'Sem permissão' });
    const g = gRes.rows[0];

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const selExtra = [];
    const params = [galleryId];
    let pi = 2;
    let whereExtra = '';
    if (hasSelBatch && Number.isFinite(filterBatch) && filterBatch > 0) {
      whereExtra += ` AND s.selection_batch = $${pi++}`;
      params.push(filterBatch);
    }
    if (hasSelClientId && Number.isFinite(clientIdParam) && clientIdParam > 0) {
      whereExtra += ` AND s.client_id = $${pi++}`;
      params.push(clientIdParam);
    }
    if (hasSelBatch) selExtra.push('s.selection_batch');
    const sRes = await client.query(
      `SELECT p.original_name, s.feedback_cliente${selExtra.length ? ', ' + selExtra.join(', ') : ''}
       FROM king_selections s
       JOIN king_photos p ON p.id = s.photo_id
       WHERE s.gallery_id=$1${whereExtra}
       ORDER BY p."order" ASC, p.id ASC`,
      params
    );
    const normalizeExportName = (n) => {
      let s = String(n || '').trim();
      // remove qualquer caminho (caso venha "pasta/arquivo.ext")
      s = s.replace(/^.*[\\/]/, '');
      // remove extensão (".JPG", ".ARW", ".PNG", etc) — mantém o código base
      const dot = s.lastIndexOf('.');
      if (dot > 0) s = s.slice(0, dot);
      return s.trim();
    };

    const names = sRes.rows.map(r => normalizeExportName(r.original_name)).filter(Boolean);
    const feedback = (sRes.rows.find(r => r.feedback_cliente)?.feedback_cliente) || null;

    const lightroom = names.join(', ');
    const windows = names.map(n => `"${String(n).replace(/\"/g, '')}"`).join(' OR ');
    const finder = names.join(' OR ');

    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    const senha_plain = hasEnc ? decryptPassword(g.senha_enc) : null;

    res.json({
      success: true,
      gallery: {
        id: g.id,
        nome_projeto: g.nome_projeto,
        slug: g.slug,
        cliente_email: g.cliente_email,
        status: g.status,
        total_fotos_contratadas: g.total_fotos_contratadas,
        min_selections: g.min_selections ?? 0,
        senha: senha_plain
      },
      feedback,
      lightroom,
      windows,
      finder,
      count: names.length,
      exportBatch: Number.isFinite(filterBatch) && filterBatch > 0 ? filterBatch : 'all',
      exportClientId: Number.isFinite(clientIdParam) && clientIdParam > 0 ? clientIdParam : null
    });
  } finally {
    client.release();
  }
}));

// ===== Preview watermarked (ADMIN) =====
router.get('/photos/:photoId/preview', protectUser, asyncHandler(async (req, res) => {
  // IMPORTANTE: aqui é ADMIN, então além de validar token,
  // precisamos garantir que a foto pertence ao usuário logado.

  const photoId = parseInt(req.params.photoId, 10);
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const pRes = await client.query(
      `SELECT p.*, g.id AS gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (pRes.rows.length === 0) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];
    const buf = await fetchPhotoFileBufferFromFilePath(photo.file_path);
    if (!buf) return res.status(500).send('Não foi possível carregar a imagem (Cloudflare/R2 não configurado).');

    // Watermark X (30%) e resize 1200
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const { width, height } = getDisplayDimensions(meta, 1200, 1200);
    const max = 1200;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const wm = await loadWatermarkForGallery(client, photo.gallery_id);
    // Overrides (preview em tempo real no admin)
    const qMode = (req.query.wm_mode || '').toString();
    if (['x', 'logo', 'full', 'tile', 'tile_dense', 'none'].includes(qMode)) wm.mode = qMode;
    const qOp = parseFloat(req.query.wm_opacity);
    if (Number.isFinite(qOp)) wm.opacity = qOp;
    const qScale = parseFloat(req.query.wm_scale);
    if (Number.isFinite(qScale)) wm.scale = qScale;
    const qRot = parseInt(req.query.wm_rotate || 0, 10);
    if ([0, 90, 180, 270].includes(qRot)) wm.rotate = qRot;
    const qStrict = String(req.query.wm_strict || '') === '1';
    if (qStrict) wm.strict = true;
    let out = null;
    try {
      out = await buildWatermarkedJpeg({
        imgBuffer: buf,
        outW,
        outH,
        watermark: wm
      });
    } catch (e) {
      const code = e?.statusCode || 500;
      const msg = e?.message || 'Erro ao gerar preview.';
      // Para o painel, sempre devolve JSON com message (evita "Erro interno do servidor" genérico).
      return res.status(code).json({ message: msg });
    }

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(out);
  } finally {
    client.release();
  }
}));

// ============================================================
// ===== Público (antes do login): capa + informações ==========
// ============================================================
router.get('/public/gallery', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });

  const client = await db.pool.connect();
  try {
    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const hasEnabled = await hasColumn(client, 'king_galleries', 'client_enabled');
    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const gRes = await client.query(
      `SELECT id, nome_projeto, slug, status, total_fotos_contratadas${hasMin ? ', min_selections' : ''}${hasSelf ? ', allow_self_signup' : ''}${hasEnabled ? ', client_enabled' : ''}${hasAccessMode ? ', access_mode' : ''}
       FROM king_galleries
       WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    let accessMode = hasAccessMode ? (g.access_mode || 'private') : 'private';
    if (accessMode === 'password') accessMode = 'signup';
    const allowSelfSignup = hasSelf ? !!g.allow_self_signup : ksAccessModeAllowsSelfSignup(accessMode);

    const pRes = await client.query('SELECT id FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC LIMIT 1', [g.id]);
    const coverPhotoId = pRes.rows.length ? pRes.rows[0].id : null;

    const totalPhotosRes = await client.query('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id=$1', [g.id]);
    const totalPhotos = totalPhotosRes.rows[0]?.c || 0;

    const deferredSignupFlow = ksAccessModeAllowsSelfSignup(accessMode) && allowSelfSignup;
    res.json({
      success: true,
      gallery: {
        id: g.id,
        nome_projeto: g.nome_projeto,
        slug: g.slug,
        status: g.status,
        total_fotos_contratadas: g.total_fotos_contratadas || 0,
        min_selections: hasMin ? (g.min_selections || 0) : 0,
        allow_self_signup: allowSelfSignup,
        client_enabled: hasEnabled ? !!g.client_enabled : true,
        access_mode: accessMode,
        total_photos: totalPhotos,
        cover_photo_id: coverPhotoId,
        deferred_signup_flow: deferredSignupFlow
      }
    });
  } finally {
    client.release();
  }
}));

// Conteúdo da galeria para modo PÚBLICO (sem login)
router.get('/public/gallery-content', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });

  const client = await db.pool.connect();
  try {
    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const hasAllowDownload = await hasColumn(client, 'king_galleries', 'allow_download');
    const hasFaceEnabled = await hasColumn(client, 'king_galleries', 'face_recognition_enabled');
    const gRes = await client.query(
      `SELECT id, nome_projeto, slug, status, total_fotos_contratadas${hasAccessMode ? ', access_mode' : ''}${hasMin ? ', min_selections' : ''}${hasAllowDownload ? ', allow_download' : ''}${hasFaceEnabled ? ', face_recognition_enabled' : ''}
       FROM king_galleries WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];
    let accessMode = hasAccessMode ? (g.access_mode || 'private') : 'private';
    if (accessMode === 'password') accessMode = 'signup';
    if (accessMode !== 'public') return res.status(403).json({ message: 'Esta galeria não é pública.' });

    const gallery = {
      ...g,
      min_selections: hasMin ? (g.min_selections || 0) : 0,
      allow_download: hasAllowDownload ? !!g.allow_download : false,
      face_recognition_enabled: hasFaceEnabled ? !!g.face_recognition_enabled : false
    };

    const hasFilePath = await hasColumn(client, 'king_photos', 'file_path');
    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    const pRes = await client.query(
      `SELECT id, original_name, "order"${hasFilePath ? ', file_path' : ''}${hasFolderId ? ', folder_id' : ', NULL::INTEGER AS folder_id'}
       FROM king_photos
       WHERE gallery_id=$1
       ORDER BY "order" ASC, id ASC`,
      [gallery.id]
    );
    const photos = (pRes.rows || []).map(p => {
      const out = { id: p.id, original_name: p.original_name, order: p.order, folder_id: p.folder_id ? parseInt(p.folder_id, 10) : null };
      if (hasFilePath && p.file_path && String(p.file_path).toLowerCase().startsWith('r2:')) {
        const objectKey = String(p.file_path).slice(3).trim().replace(/^\/+/, '');
        if (objectKey) out.url = r2PublicUrl(objectKey) || undefined;
      }
      return out;
    });
    const folders = await listFoldersForGallery(client, gallery.id);
    res.json({
      success: true,
      gallery: { ...gallery, photos, folders, locked: true, allow_download: !!gallery.allow_download, face_recognition_enabled: !!gallery.face_recognition_enabled },
      selectedPhotoIds: []
    });
  } finally {
    client.release();
  }
}));

// Preview de foto para galeria PÚBLICA (sem token)
router.get('/public/photos/:photoId/preview', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).send('slug é obrigatório');
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).send('photoId inválido');

  const client = await db.pool.connect();
  try {
    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasAllowDownload = await hasColumn(client, 'king_galleries', 'allow_download');
    const gRes = await client.query(
      `SELECT id${hasAccessMode ? ', access_mode' : ''}${hasAllowDownload ? ', allow_download' : ''} FROM king_galleries WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).send('Não encontrado');
    let accessMode = hasAccessMode ? (gRes.rows[0].access_mode || 'private') : 'private';
    if (accessMode === 'password') accessMode = 'signup';
    if (accessMode !== 'public') return res.status(403).send('Galeria não é pública');
    const galleryId = gRes.rows[0].id;
    const allowDownload = hasAllowDownload && !!gRes.rows[0].allow_download;
    const isDownload = String(req.query.download || '') === '1';

    const pRes = await client.query('SELECT * FROM king_photos WHERE id=$1 AND gallery_id=$2', [photoId, galleryId]);
    if (pRes.rows.length === 0) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];
    const useThumb = !isDownload && ['1', 'true', 'thumb', 's'].includes(String(req.query.thumb || req.query.size || '').toLowerCase());
    const [buf, wm] = await Promise.all([
      fetchPhotoFileBufferFromFilePath(photo.file_path),
      loadWatermarkForGallery(client, galleryId)
    ]);
    if (!buf) return res.status(500).send('Não foi possível carregar a imagem.');
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const { width, height } = getDisplayDimensions(meta, 1200, 1200);
    const max = useThumb ? 400 : 1200;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const out = await buildWatermarkedJpeg({
      imgBuffer: buf,
      outW,
      outH,
      watermark: wm,
      jpegOpts: { quality: useThumb ? 76 : 80, progressive: true }
    });
    res.set('Content-Type', 'image/jpeg');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'private, max-age=' + (useThumb ? '86400' : '3600'));
    if (isDownload && allowDownload) {
      const fn = (photo.original_name || `foto-${photoId}.jpg`).toString().replace(/[\/\\:*?"<>|]+/g, '-');
      res.set('Content-Disposition', `attachment; filename="${fn.endsWith('.jpg') || fn.endsWith('.jpeg') ? fn : fn + '.jpg'}"`);
    }
    res.send(out);
  } finally {
    client.release();
  }
}));

router.get('/public/cover', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).send('slug é obrigatório');

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id FROM king_galleries WHERE slug=$1', [slug]);
    if (gRes.rows.length === 0) return res.status(404).send('Galeria não encontrada');
    const galleryId = gRes.rows[0].id;

    const hasCover = await hasColumn(client, 'king_photos', 'is_cover');
    const pRes = hasCover
      ? await client.query('SELECT * FROM king_photos WHERE gallery_id=$1 ORDER BY is_cover DESC, "order" ASC, id ASC LIMIT 1', [galleryId])
      : await client.query('SELECT * FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC LIMIT 1', [galleryId]);
    if (pRes.rows.length === 0) return res.status(404).send('Sem fotos');
    const photo = pRes.rows[0];
    const buf = await fetchPhotoFileBufferFromFilePath(photo.file_path);
    if (!buf) return res.status(500).send('Não foi possível carregar a capa (Cloudflare/R2 não configurado).');

    // Capa: preview watermarked + blur leve, 1400px
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const { width, height } = getDisplayDimensions(meta, 1400, 900);
    const max = 1400;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="0.22" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="0.22" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );

    const out = await img
      .resize(outW, outH, { fit: 'inside' })
      .composite([{ input: svg, top: 0, left: 0 }])
      .blur(2.2)
      .jpeg({ quality: 78 })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=900'); // 15min
    res.send(out);
  } finally {
    client.release();
  }
}));

// Imagem OG (WhatsApp/Instagram): usar a foto de CAPA do projeto, sem logo do site.
// Retorna JPEG 1200x630 (SEM cortar a foto): usa "contain" com fundo desfocado.
router.get('/public/og-image', asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString().trim();
  if (!slug) return res.status(400).send('slug é obrigatório');

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id FROM king_galleries WHERE slug=$1', [slug]);
    if (gRes.rows.length === 0) return res.status(404).send('Galeria não encontrada');
    const galleryId = gRes.rows[0].id;

    const hasCover = await hasColumn(client, 'king_photos', 'is_cover');
    const pRes = hasCover
      ? await client.query('SELECT * FROM king_photos WHERE gallery_id=$1 ORDER BY is_cover DESC, "order" ASC, id ASC LIMIT 1', [galleryId])
      : await client.query('SELECT * FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC LIMIT 1', [galleryId]);
    if (pRes.rows.length === 0) return res.status(404).send('Sem fotos');
    const photo = pRes.rows[0];
    const buf = await fetchPhotoFileBufferFromFilePath(photo.file_path);
    if (!buf) return res.status(500).send('Não foi possível carregar a capa (Cloudflare/R2 não configurado).');

    // Fundo desfocado (preenche 1200x630) + foto inteira por cima (contain)
    const bg = await sharp(buf)
      .rotate()
      .resize(1200, 630, { fit: 'cover', position: 'entropy' })
      .blur(18)
      .modulate({ brightness: 0.78, saturation: 0.95 })
      .jpeg({ quality: 78 })
      .toBuffer();

    const fg = await sharp(buf)
      .rotate()
      .resize(1200, 630, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .jpeg({ quality: 88 })
      .toBuffer();

    const out = await sharp(bg)
      .composite([{ input: fg, top: 0, left: 0 }])
      .jpeg({ quality: 84 })
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=900'); // 15min
    res.send(out);
  } finally {
    client.release();
  }
}));

// ===== Admin: ações de fotos (favorito/capa/substituir/excluir/download) =====
router.patch('/photos/:photoId', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).json({ message: 'photoId inválido' });

  const { is_favorite, is_cover, original_name, order, edited_file_path } = req.body || {};

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT p.id, p.gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const galleryId = own.rows[0].gallery_id;

    const sets = [];
    const values = [];
    let i = 1;

    if (typeof is_favorite !== 'undefined' && await hasColumn(client, 'king_photos', 'is_favorite')) {
      sets.push(`is_favorite=$${i++}`);
      values.push(!!is_favorite);
    }
    if (typeof original_name !== 'undefined') {
      sets.push(`original_name=$${i++}`);
      values.push(String(original_name || '').slice(0, 500));
    }
    if (typeof order !== 'undefined') {
      sets.push(`"order"=$${i++}`);
      values.push(parseInt(order || 0, 10) || 0);
    }
    if (typeof edited_file_path !== 'undefined' && await hasColumn(client, 'king_photos', 'edited_file_path')) {
      const v = edited_file_path == null ? null : String(edited_file_path).trim();
      sets.push(`edited_file_path=$${i++}`);
      values.push(v || null);
    }

    // capa: limpar outras e setar esta
    if (typeof is_cover !== 'undefined' && await hasColumn(client, 'king_photos', 'is_cover')) {
      if (is_cover) {
        await client.query('UPDATE king_photos SET is_cover=FALSE WHERE gallery_id=$1', [galleryId]);
        sets.push(`is_cover=$${i++}`);
        values.push(true);
      } else {
        sets.push(`is_cover=$${i++}`);
        values.push(false);
      }
    }

    if (!sets.length) return res.json({ success: true });
    values.push(photoId);
    await client.query(`UPDATE king_photos SET ${sets.join(', ')} WHERE id=$${i}`, values);
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:galleryId/photos/delete-batch', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  const { photo_ids } = req.body || {};
  const ids = Array.isArray(photo_ids) ? photo_ids.map(x => parseInt(x, 10)).filter(Boolean) : [];
  if (!galleryId || !ids.length) return res.status(400).json({ message: 'galleryId e photo_ids são obrigatórios' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const gRes = await client.query(
      `SELECT id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (!gRes.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    const own = await client.query(
      `SELECT p.id, p.file_path FROM king_photos p
       WHERE p.gallery_id=$1 AND p.id = ANY($2::int[])`,
      [galleryId, ids]
    );
    const toDelete = own.rows.map(r => r.id);
    if (!toDelete.length) return res.json({ success: true, deleted: 0 });

    const r2Keys = [];
    for (const r of own.rows) {
      const k = extractR2Key(r.file_path);
      if (k) r2Keys.push(k);
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM king_selections WHERE photo_id = ANY($1::int[])', [toDelete]);
    await client.query('DELETE FROM king_photos WHERE id = ANY($1::int[])', [toDelete]);
    await client.query('COMMIT');

    if (r2Keys.length) {
      try {
        const hasWm = await hasColumn(client, 'king_galleries', 'watermark_path');
        let safeKeys = r2Keys;
        if (hasWm) {
          const wmRes = await client.query(`SELECT watermark_path FROM king_galleries WHERE watermark_path IS NOT NULL AND watermark_path != ''`);
          const wmSet = new Set(wmRes.rows.map(r => normalizeR2Key(extractR2Key(r.watermark_path))).filter(Boolean));
          safeKeys = r2Keys.filter(k => { const n = normalizeR2Key(k); return !n || !wmSet.has(n); });
        }
        if (safeKeys.length) {
          const chunks = [];
          for (let i = 0; i < safeKeys.length; i += 100) chunks.push(safeKeys.slice(i, i + 100));
          for (const chunk of chunks) await deleteR2BatchViaWorker(chunk);
        }
      } catch (_) { }
    }

    return res.json({ success: true, deleted: toDelete.length });
  } finally {
    client.release();
  }
}));

router.delete('/photos/:photoId', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).json({ message: 'photoId inválido' });
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT p.id, p.file_path
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const filePath = String(own.rows[0].file_path || '');
    const imageId = filePath.startsWith('cfimage:') ? filePath.replace('cfimage:', '') : null;
    const r2Key = extractR2Key(filePath);

    // Apagar do banco primeiro
    await client.query('BEGIN');
    await client.query('DELETE FROM king_selections WHERE photo_id=$1', [photoId]);
    await client.query('DELETE FROM king_photos WHERE id=$1', [photoId]);
    await client.query('COMMIT');

    let cfAttempted = false;
    let cfDeleted = false;
    let cfSkipped = false;
    let r2Attempted = false;
    let r2Deleted = false;

    // R2: apagar objeto do bucket (best-effort)
    if (r2Key) {
      try {
        r2Attempted = true;
        const stillUsedPhotos = await client.query(
          'SELECT 1 FROM king_photos WHERE file_path=$1 LIMIT 1',
          [`r2:${r2Key}`]
        );
        let stillUsedWatermark = { rows: [] };
        const hasWm = await hasColumn(client, 'king_galleries', 'watermark_path');
        if (hasWm) {
          stillUsedWatermark = await client.query(
            'SELECT 1 FROM king_galleries WHERE watermark_path=$1 LIMIT 1',
            [`r2:${r2Key}`]
          );
        }
        const stillUsed = stillUsedPhotos.rows.length > 0 || stillUsedWatermark.rows.length > 0;
        if (!stillUsed) r2Deleted = await deleteR2ObjectViaWorker(r2Key);
      } catch (_) { }
    }

    // Cloudflare Images: apagar (best-effort)
    if (imageId) {
      try {
        cfAttempted = true;
        const stillUsedPhotos = await client.query(
          'SELECT 1 FROM king_photos WHERE file_path=$1 LIMIT 1',
          [`cfimage:${imageId}`]
        );
        let stillUsedWatermark = { rows: [] };
        const hasWm = await hasColumn(client, 'king_galleries', 'watermark_path');
        if (hasWm) {
          stillUsedWatermark = await client.query(
            'SELECT 1 FROM king_galleries WHERE watermark_path=$1 LIMIT 1',
            [`cfimage:${imageId}`]
          );
        }
        const stillUsed = stillUsedPhotos.rows.length > 0 || stillUsedWatermark.rows.length > 0;
        if (!stillUsed) {
          cfDeleted = await deleteCloudflareImage(imageId);
        } else {
          cfSkipped = true;
        }
      } catch (_) { }
    }

    res.json({
      success: true,
      cloudflare: { attempted: cfAttempted, deleted: cfDeleted, skipped: cfSkipped },
      r2: { attempted: r2Attempted, deleted: r2Deleted }
    });
  } finally {
    client.release();
  }
}));

// ===== Substituir foto via R2 (Worker ou proxy) — SOMENTE R2, sem Cloudflare Images
router.post('/photos/:photoId/replace-r2', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  const { key, receipt, original_name } = req.body || {};
  if (!photoId || !key || !receipt) return res.status(400).json({ message: 'photoId, key e receipt são obrigatórios' });
  if (!KS_WORKER_SECRET) return res.status(501).json({ success: false, message: 'Worker não configurado (KINGSELECTION_WORKER_SECRET).' });

  const keyStr = String(key || '').replace(/^\/+/, '').trim();
  const receiptStr = String(receipt || '').trim();
  const payload = ksVerifyToken(receiptStr);
  if (!payload || payload.typ !== 'ks_receipt') return res.status(400).json({ message: 'Recibo inválido' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const cur = await client.query(
      `SELECT p.id, p.gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!cur.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    const galleryId = cur.rows[0].gallery_id;
    if (parseInt(payload.galleryId || 0, 10) !== galleryId || String(payload.key || '') !== keyStr) {
      return res.status(400).json({ message: 'Key ou recibo não corresponde à galeria' });
    }
    if (!keyStr.startsWith(`galleries/${galleryId}/`)) return res.status(400).json({ message: 'Key inválida' });

    await client.query(
      'UPDATE king_photos SET file_path=$1, original_name=$2 WHERE id=$3',
      [`r2:${keyStr}`, String(original_name || 'foto').slice(0, 500), photoId]
    );
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.post('/photos/:photoId/replace', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  const { imageId, original_name } = req.body || {};
  if (!photoId || !imageId) return res.status(400).json({ message: 'photoId e imageId são obrigatórios' });
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT p.id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });
    // pegar file_path antigo para tentar limpar do Cloudflare (best-effort)
    const cur = await client.query('SELECT gallery_id, file_path FROM king_photos WHERE id=$1', [photoId]);
    const galleryId = cur.rows?.[0]?.gallery_id || null;
    const oldFilePath = String(cur.rows?.[0]?.file_path || '');
    const oldImageId = oldFilePath.startsWith('cfimage:') ? oldFilePath.replace('cfimage:', '').trim() : null;

    const file_path = `cfimage:${imageId}`;
    await client.query(
      'UPDATE king_photos SET file_path=$1, original_name=$2 WHERE id=$3',
      [file_path, String(original_name || 'foto').slice(0, 500), photoId]
    );

    // Tentar deletar imagem antiga se não houver outras referências (evita órfãs)
    let cfAttempted = false;
    let cfDeleted = false;
    let cfSkipped = false;
    if (oldImageId && galleryId) {
      try {
        cfAttempted = true;
        const stillUsedPhotos = await client.query(
          'SELECT 1 FROM king_photos WHERE file_path=$1 AND id<>$2 LIMIT 1',
          [`cfimage:${oldImageId}`, photoId]
        );
        let stillUsedWatermark = { rows: [] };
        const hasWm = await hasColumn(client, 'king_galleries', 'watermark_path');
        if (hasWm) {
          stillUsedWatermark = await client.query(
            'SELECT 1 FROM king_galleries WHERE watermark_path=$1 LIMIT 1',
            [`cfimage:${oldImageId}`]
          );
        }
        const stillUsed = stillUsedPhotos.rows.length > 0 || stillUsedWatermark.rows.length > 0;
        if (!stillUsed) {
          cfDeleted = await deleteCloudflareImage(oldImageId);
        } else {
          cfSkipped = true;
        }
      } catch (_) {
        // best-effort
      }
    }

    res.json({ success: true, cloudflare: { attempted: cfAttempted, deleted: cfDeleted, skipped: cfSkipped } });
  } finally {
    client.release();
  }
}));

router.get('/photos/:photoId/download', protectUser, asyncHandler(async (req, res) => {
  const photoId = parseInt(req.params.photoId, 10);
  if (!photoId) return res.status(400).send('photoId inválido');

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const pRes = await client.query(
      `SELECT p.*, g.id AS gallery_id
       FROM king_photos p
       JOIN king_galleries g ON g.id = p.gallery_id
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE p.id=$1 AND pi.user_id=$2`,
      [photoId, userId]
    );
    if (!pRes.rows.length) return res.status(404).send('Não encontrado');
    const photo = pRes.rows[0];

    const buf = await fetchPhotoFileBufferFromFilePath(photo.file_path);
    if (!buf) return res.status(500).send('Não foi possível carregar a imagem (Cloudflare/R2 não configurado).');

    // download como preview com marca (mais seguro). Se quiser original no futuro, adiciona mode=original.
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const { width, height } = getDisplayDimensions(meta, 2400, 2400);
    const max = 2400;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    const wm = await loadWatermarkForGallery(client, photo.gallery_id);
    const out = await buildWatermarkedJpeg({ imgBuffer: buf, outW, outH, watermark: wm });

    const filename = (photo.original_name || `foto-${photoId}.jpg`).toString().replace(/[\/\\:*?"<>|]+/g, '-');
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="${filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : filename + '.jpg'}"`);
    res.send(out);
  } finally {
    client.release();
  }
}));

// ============================================================
// ===== Cliente (login por galeria, estilo Alboom) ============
// ============================================================

function verifyClientToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (!payload || payload.type !== 'kingselection_client') return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function requireClient(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : null;
  const payload = verifyClientToken(token);
  if (!payload) return res.status(401).json({ message: 'Não autorizado.' });
  req.ksClient = payload;
  req.ksCtx = parseKsClientContext(payload);
  next();
}

router.post('/client/login', asyncHandler(async (req, res) => {
  const { slug, email, senha } = req.body || {};
  if (!slug || !email || !senha) return res.status(400).json({ message: 'Informe slug, email e senha.' });

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT * FROM king_galleries WHERE slug=$1', [String(slug)]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    const emailNorm = String(email).toLowerCase().trim();

    // Se existir tabela de clientes, validar contra ela (multi-client).
    if (await hasTable(client, 'king_gallery_clients')) {
      const cRes = await client.query(
        `SELECT id, senha_hash, enabled
         FROM king_gallery_clients
         WHERE gallery_id=$1 AND lower(email)=lower($2)
         ORDER BY id ASC
         LIMIT 1`,
        [g.id, emailNorm]
      );
      if (cRes.rows.length) {
        const c = cRes.rows[0];
        if (c.enabled === false) return res.status(401).json({ message: 'Acesso desativado. Solicite um novo acesso ao fotógrafo.' });
        const ok = await bcrypt.compare(String(senha), String(c.senha_hash));
        if (!ok) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        const token = jwt.sign(
          { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: c.id, tyh: false },
          config.jwt.secret,
          { expiresIn: '14d' }
        );
        return res.json({ success: true, token });
      }
      // se não encontrou cliente, cai para o modelo antigo (compatibilidade)
    }

    if (String(emailNorm) !== String(g.cliente_email).toLowerCase().trim()) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }
    const okLegacy = await bcrypt.compare(String(senha), String(g.senha_hash));
    if (!okLegacy) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });

    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: null, tyh: false },
      config.jwt.secret,
      { expiresIn: '14d' }
    );
    res.json({ success: true, token });
  } finally {
    client.release();
  }
}));

/** Visitante (cadastro ao enviar): reentrar só com nome + e-mail + telefone (sem senha). */
router.post('/client/login-by-details', asyncHandler(async (req, res) => {
  const { slug, nome, email, telefone } = req.body || {};
  if (!slug || !nome || !email) {
    return res.status(400).json({
      message: 'Informe slug, nome e e-mail. O telefone é obrigatório apenas se já estiver salvo no seu cadastro.'
    });
  }

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id, slug FROM king_galleries WHERE slug=$1', [String(slug).trim()]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(503).json({ message: 'Cadastro de clientes indisponível neste servidor.' });
    }

    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const hasAm = await hasColumn(client, 'king_galleries', 'access_mode');
    const cols = ['id'].concat(hasAm ? ['access_mode'] : []).concat(hasSelf ? ['allow_self_signup'] : []);
    const gx = await client.query(`SELECT ${cols.join(', ')} FROM king_galleries WHERE id=$1`, [g.id]);
    const grow = gx.rows[0] || {};
    let am = hasAm ? String(grow.access_mode || 'private').toLowerCase() : 'private';
    if (am === 'password') am = 'signup';
    const allow = hasSelf ? !!grow.allow_self_signup : ksAccessModeAllowsSelfSignup(am);
    if (am !== 'signup' || !allow) {
      return res.status(403).json({
        message: 'Nesta galeria use e-mail e senha. O acesso só com nome e telefone é para o fluxo de cadastro ao enviar.'
      });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const nomeNorm = ksNormClientNameMatch(nome);
    const telDigits = ksNormClientPhoneDigits(telefone || '');

    const cRes = await client.query(
      `SELECT id, nome, telefone, enabled, status
       FROM king_gallery_clients
       WHERE gallery_id=$1 AND lower(email)=lower($2)
       ORDER BY id DESC
       LIMIT 1`,
      [g.id, emailNorm]
    );
    if (!cRes.rows.length) {
      return res.status(401).json({
        message:
          'Não encontramos cadastro com este e-mail nesta galeria. Verifique o e-mail ou envie a seleção primeiro; se já enviou, use o mesmo e-mail de antes.'
      });
    }
    const row = cRes.rows[0];
    if (row.enabled === false) {
      return res.status(401).json({ message: 'Acesso desativado. Solicite um novo acesso ao fotógrafo.' });
    }

    const st = normKsStatus(row.status);
    if (st === 'finalizado') {
      return res.status(403).json({ message: 'Esta seleção já foi finalizada. Fale com o fotógrafo.' });
    }

    if (ksNormClientNameMatch(row.nome) !== nomeNorm) {
      return res.status(401).json({
        message:
          'O nome não confere com o cadastro deste e-mail. Use exatamente o mesmo nome de quando você enviou a seleção.'
      });
    }

    const rowTelDigits = ksNormClientPhoneDigits(row.telefone || '');
    if (rowTelDigits.length >= 8) {
      if (telDigits.length < 8) {
        return res.status(400).json({ message: 'Informe o telefone cadastrado (com DDD ou código do país).' });
      }
      if (telDigits !== rowTelDigits) {
        return res.status(401).json({
          message:
            'O telefone não confere com o cadastro deste e-mail. Use o mesmo número de quando você enviou ou entre com e-mail e senha.'
        });
      }
    } else if (String(telefone || '').trim() && telDigits.length > 0 && telDigits.length < 8) {
      return res.status(400).json({
        message: 'Telefone incompleto. Deixe em branco se seu cadastro ainda não tinha telefone, ou informe o número completo com DDD.'
      });
    }

    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: row.id, tyh: false },
      config.jwt.secret,
      { expiresIn: '14d' }
    );
    res.json({ success: true, token });
  } finally {
    client.release();
  }
}));

// ===== Cliente: autocadastro (se habilitado na galeria) =====
router.post('/client/register', asyncHandler(async (req, res) => {
  const { slug, nome, email, telefone } = req.body || {};
  if (!slug || !nome || !email) return res.status(400).json({ message: 'Informe slug, nome e e-mail.' });

  const client = await db.pool.connect();
  try {
    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');

    const gRes = await client.query('SELECT * FROM king_galleries WHERE slug=$1', [String(slug)]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    if (!hasSelf || !g.allow_self_signup) {
      return res.status(403).json({ message: 'Autocadastro desativado nesta galeria.' });
    }

    // Multi-client: cria um novo cliente nesta galeria.
    if (!(await hasTable(client, 'king_gallery_clients'))) {
      return res.status(500).json({ message: 'Tabela de clientes não disponível (migração pendente).' });
    }

    const pass = String(Math.floor(100000 + Math.random() * 900000));
    const senha_hash = await bcrypt.hash(pass, 10);
    const senha_enc = hasEnc ? encryptPassword(pass) : encryptPassword(pass); // sempre gera, mesmo sem senha_enc no gallery
    const emailNorm = String(email).toLowerCase().trim();
    const telNorm = String(telefone || '').trim();
    const nomeNorm = String(nome || '').trim().slice(0, 255);

    let newClientId;
    try {
      const insC = await client.query(
        `INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),NOW())
         RETURNING id`,
        [g.id, nomeNorm, emailNorm, telNorm || null, senha_hash, senha_enc]
      );
      newClientId = insC.rows[0].id;
    } catch (e) {
      if (String(e.message || '').toLowerCase().includes('uniq_king_gallery_clients_gallery_email')) {
        return res.status(409).json({ message: 'Já existe um cliente com este e-mail nesta galeria.' });
      }
      throw e;
    }

    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: newClientId, tyh: false },
      config.jwt.secret,
      { expiresIn: '14d' }
    );

    res.json({ success: true, token, client_password: pass });
  } finally {
    client.release();
  }
}));

// Galeria pública: sessão anónima (mesmo modelo que seleções com client_id NULL)
router.post('/client/public-enter', asyncHandler(async (req, res) => {
  const slug = String((req.body || {}).slug || '').trim();
  if (!slug) return res.status(400).json({ message: 'Informe o slug da galeria.' });

  const client = await db.pool.connect();
  try {
    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const gRes = await client.query(
      `SELECT id, slug${hasAccessMode ? ', access_mode' : ''} FROM king_galleries WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];
    let accessMode = hasAccessMode ? String(g.access_mode || 'private').toLowerCase() : 'private';
    if (accessMode === 'password') accessMode = 'signup';
    if (accessMode !== 'public') {
      return res.status(403).json({ message: 'Esta galeria exige login ou cadastro.' });
    }

    const sk = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: null, sk },
      config.jwt.secret,
      { expiresIn: '14d' }
    );
    res.json({ success: true, token });
  } finally {
    client.release();
  }
}));

/** Visitante: sessão anónima com chave (cadastro só ao enviar). Só para galeria signup + autocadastro. */
router.post('/client/signup-enter', asyncHandler(async (req, res) => {
  const slug = String((req.body || {}).slug || '').trim();
  if (!slug) return res.status(400).json({ message: 'Informe o slug da galeria.' });

  const client = await db.pool.connect();
  try {
    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const gRes = await client.query(
      `SELECT id, slug${hasSelf ? ', allow_self_signup' : ''}${hasAccessMode ? ', access_mode' : ''} FROM king_galleries WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];
    let accessMode = hasAccessMode ? String(g.access_mode || 'private').toLowerCase() : 'private';
    if (accessMode === 'password') accessMode = 'signup';
    const allowSelf = hasSelf ? !!g.allow_self_signup : ksAccessModeAllowsSelfSignup(accessMode);
    if (!ksAccessModeAllowsSelfSignup(accessMode) || !allowSelf) {
      return res.status(403).json({ message: 'Esta galeria não usa o fluxo de cadastro ao enviar.' });
    }

    const sk = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: null, sk },
      config.jwt.secret,
      { expiresIn: '14d' }
    );
    res.json({ success: true, token });
  } finally {
    client.release();
  }
}));

router.get('/client/gallery', requireClient, asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (slug !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const client = await db.pool.connect();
  try {
    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const hasAllowDownload = await hasColumn(client, 'king_galleries', 'allow_download');
    const hasFaceEnabled = await hasColumn(client, 'king_galleries', 'face_recognition_enabled');
    const hasClientImgQ = await hasColumn(client, 'king_galleries', 'client_image_quality');
    const hasThankYou = await hasColumn(client, 'king_galleries', 'thank_you_title');
    const hasThankYouName = await hasColumn(client, 'king_galleries', 'thank_you_photographer_name');
    const hasAccessModeG = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasAllowSelfG = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const gRes = await client.query(
      `SELECT id, nome_projeto, slug, status, total_fotos_contratadas${hasMin ? ', min_selections' : ''}${hasAllowDownload ? ', allow_download' : ''}${hasFaceEnabled ? ', face_recognition_enabled' : ''}${hasClientImgQ ? ', client_image_quality' : ''}${hasAccessModeG ? ', access_mode' : ''}${hasAllowSelfG ? ', allow_self_signup' : ''}${hasThankYou ? ', thank_you_title, thank_you_message, thank_you_image_url' : ''}${hasThankYouName ? ', thank_you_photographer_name' : ''}
       FROM king_galleries
       WHERE id=$1`,
      [req.ksClient.galleryId]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const gallery = gRes.rows[0];
    const folders = await listFoldersForGallery(client, gallery.id);

    const hasFilePath = await hasColumn(client, 'king_photos', 'file_path');
    const hasFolderId = await hasColumn(client, 'king_photos', 'folder_id');
    const pRes = await client.query(
      `SELECT id, original_name, "order"${hasFilePath ? ', file_path' : ''}${hasFolderId ? ', folder_id' : ''} FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC`,
      [gallery.id]
    );

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const hasSessionKey = await hasColumn(client, 'king_selections', 'session_key');
    const cid = req.ksCtx.cid;
    const sk = req.ksCtx.sk;

    const selCols = ['photo_id'].concat(hasSelBatch ? ['selection_batch'] : []);
    let selectedPhotoIds = [];
    let selectionBatchByPhotoId = {};
    if (hasSelClientId) {
      if (cid) {
        const sRes = await client.query(
          `SELECT ${selCols.join(', ')} FROM king_selections WHERE gallery_id=$1 AND client_id=$2`,
          [gallery.id, cid]
        );
        selectedPhotoIds = sRes.rows.map(r => r.photo_id);
        if (hasSelBatch) {
          selectionBatchByPhotoId = Object.fromEntries(
            sRes.rows.map(r => [String(r.photo_id), parseInt(r.selection_batch, 10) || 1])
          );
        }
      } else if (sk && hasSessionKey) {
        const sRes = await client.query(
          `SELECT ${selCols.join(', ')} FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND session_key=$2`,
          [gallery.id, sk]
        );
        selectedPhotoIds = sRes.rows.map(r => r.photo_id);
        if (hasSelBatch) {
          selectionBatchByPhotoId = Object.fromEntries(
            sRes.rows.map(r => [String(r.photo_id), parseInt(r.selection_batch, 10) || 1])
          );
        }
      } else {
        const sRes = await client.query(
          `SELECT ${selCols.join(', ')} FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL${hasSessionKey ? ' AND (session_key IS NULL OR session_key = \'\')' : ''}`,
          [gallery.id]
        );
        selectedPhotoIds = sRes.rows.map(r => r.photo_id);
        if (hasSelBatch) {
          selectionBatchByPhotoId = Object.fromEntries(
            sRes.rows.map(r => [String(r.photo_id), parseInt(r.selection_batch, 10) || 1])
          );
        }
      }
    } else {
      const sRes = await client.query(
        hasSelBatch
          ? 'SELECT photo_id, selection_batch FROM king_selections WHERE gallery_id=$1'
          : 'SELECT photo_id FROM king_selections WHERE gallery_id=$1',
        [gallery.id]
      );
      selectedPhotoIds = sRes.rows.map(r => r.photo_id);
      if (hasSelBatch) {
        selectionBatchByPhotoId = Object.fromEntries(
          sRes.rows.map(r => [String(r.photo_id), parseInt(r.selection_batch, 10) || 1])
        );
      }
    }
    const currentSelectionRound = await ksGetCurrentSelectionRound(client, gallery.id, cid);

    const galleryAccessMode = ksNormAccessMode(hasAccessModeG ? gallery.access_mode : 'private');
    const salesModeActive = ksIsPaidEventAccessMode(galleryAccessMode);
    const salesConfig = salesModeActive ? await ksLoadGallerySalesConfig(client, gallery.id) : null;
    const salePackages = salesModeActive ? (await ksListSalePackages(client, gallery.id)).filter((p) => p.active !== false) : [];
    const selectedCountForPricing = selectedPhotoIds.length;
    const computedTotalCents = salesModeActive
      ? ksComputeBestPriceCents(
        selectedCountForPricing,
        salePackages,
        salesConfig?.sales_unit_price_cents || 0,
        salesConfig?.sales_price_mode || 'best_price_auto'
      )
      : null;
    const maxPackageQty = salePackages.length ? Math.max(...salePackages.map((p) => parseInt(p.photo_qty, 10) || 0), 0) : 0;
    const overLimitWarn = !!(salesModeActive
      && salesConfig?.sales_over_limit_policy === 'allow_and_warn'
      && maxPackageQty > 0
      && selectedCountForPricing > maxPackageQty);
    const paymentState = (salesModeActive && cid)
      ? await ksGetPaymentByClientRound(client, gallery.id, parseInt(cid, 10), currentSelectionRound)
      : null;
    const approvalsState = (salesModeActive && cid)
      ? await ksListApprovalsByClientRound(client, gallery.id, parseInt(cid, 10), currentSelectionRound)
      : [];
    const approvedPhotoIds = approvalsState
      .filter((a) => String(a.status || '').toLowerCase() === 'approved')
      .map((a) => parseInt(a.photo_id, 10))
      .filter(Boolean);

    const resolvedClientId = await resolveFaceClientIdForSession(client, gallery.id, cid, sk);
    const faceOn = hasFaceEnabled && !!gallery.face_recognition_enabled;
    const faceRecognitionUsable = !!(faceOn && resolvedClientId);

    const locked = await ksResolveClientSelectionLocked(client, req, gallery.id, gallery);

    const frozenSelectionPhotoIds = hasSelBatch
      ? selectedPhotoIds.filter((pid) => (selectionBatchByPhotoId[String(pid)] || 1) < currentSelectionRound)
      : [];
    const immutableSelectionNotice =
      !locked && hasSelBatch && frozenSelectionPhotoIds.length
        ? 'Parte da sua seleção já foi enviada em uma rodada anterior: essas fotos continuam escolhidas e não podem ser desmarcadas. Você pode apenas acrescentar novas fotos (e desmarcar só o que escolher nesta rodada).'
        : null;

    const photos = (pRes.rows || []).map(p => {
      const out = { id: p.id, original_name: p.original_name, order: p.order };
      if (hasFolderId) out.folder_id = p.folder_id ? parseInt(p.folder_id, 10) : null;
      if (hasFilePath && p.file_path && String(p.file_path).toLowerCase().startsWith('r2:')) {
        const objectKey = String(p.file_path).slice(3).trim().replace(/^\/+/, '');
        if (objectKey) out.url = r2PublicUrl(objectKey) || undefined;
      }
      return out;
    });

    // Nome do fotógrafo (dono da galeria) para mensagem de obrigado — prioridade: thank_you_photographer_name > perfil > nome_projeto
    let photographerDisplayName = (gallery.thank_you_photographer_name && String(gallery.thank_you_photographer_name).trim()) || gallery.nome_projeto || 'Fotógrafo';
    if (!gallery.thank_you_photographer_name || !String(gallery.thank_you_photographer_name).trim()) {
      try {
        const nameRes = await client.query(
          `SELECT COALESCE(p.display_name, u.email, '') AS name
           FROM king_galleries g
           JOIN profile_items pi ON pi.id = g.profile_item_id
           JOIN users u ON u.id = pi.user_id
           LEFT JOIN user_profiles p ON p.user_id = u.id
           WHERE g.id=$1 LIMIT 1`,
          [req.ksClient.galleryId]
        );
        if (nameRes.rows[0]?.name) photographerDisplayName = String(nameRes.rows[0].name).trim();
      } catch (_) { }
    }

    // Config da página de finalização (obrigado)
    const thankYouConfig = hasThankYou ? {
      title: gallery.thank_you_title || 'Obrigado!',
      message: gallery.thank_you_message || null,
      imageUrl: gallery.thank_you_image_url || null
    } : { title: 'Obrigado!', message: null, imageUrl: null };

    const selectedCount = selectedPhotoIds.length;

    let deferredSignupActive = false;
    if (!cid && sk && hasSessionKey) {
      const hasSelfG = await hasColumn(client, 'king_galleries', 'allow_self_signup');
      const hasAmG = await hasColumn(client, 'king_galleries', 'access_mode');
      const gCols = ([]).concat(hasAmG ? ['access_mode'] : []).concat(hasSelfG ? ['allow_self_signup'] : []);
      if (gCols.length) {
        const gr = await client.query(
          `SELECT ${gCols.join(', ')} FROM king_galleries WHERE id=$1`,
          [gallery.id]
        );
        const row = gr.rows[0] || {};
        let am = hasAmG ? String(row.access_mode || 'private').toLowerCase() : 'private';
        if (am === 'password') am = 'signup';
        const allow = hasSelfG ? !!row.allow_self_signup : ksAccessModeAllowsSelfSignup(am);
        deferredSignupActive = ksAccessModeAllowsSelfSignup(am) && allow;
      }
    }

    // Mensagem para exibir quando a seleção já foi enviada (página com cadeado)
    let lockedMessage = null;
    if (locked) {
      let revisaoSelfHint = '';
      if (cid && (await hasColumn(client, 'king_gallery_clients', 'status'))) {
        const stMsgRes = await client.query('SELECT status FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2', [cid, gallery.id]);
        const stc = normKsStatus(stMsgRes.rows?.[0]?.status);
        const defMsg = ksGalleryRowIsDeferredSignup(gallery, hasAccessModeG, hasAllowSelfG);
        if (stc === 'revisao' && defMsg && ksClientJwtThankYouHold(req.ksClient, stc)) {
          revisaoSelfHint =
            ' Para alterar sua seleção, clique em Sair e use “Entrar na minha seleção” com o mesmo nome, e-mail e telefone.';
        }
      }
      if (selectedCount > 0) {
        lockedMessage = `Obrigado! Você selecionou ${selectedCount} foto(s). Se quiser selecionar mais, peça ao fotógrafo para liberar novamente. Se já fez a seleção, entre em contato com ele.${revisaoSelfHint}`;
      } else {
        lockedMessage = `Nenhuma foto foi selecionada. Se precisar fazer sua seleção, entre em contato com o fotógrafo para reativar.${revisaoSelfHint}`;
      }
    }

    res.json({
      success: true,
      gallery: {
        ...gallery,
        photos,
        folders,
        locked,
        allow_download: salesModeActive ? false : (hasAllowDownload ? !!gallery.allow_download : false),
        face_recognition_enabled: hasFaceEnabled ? !!gallery.face_recognition_enabled : false,
        client_image_quality: hasClientImgQ ? normalizeClientImageQuality(gallery.client_image_quality) : 'low',
        access_mode: galleryAccessMode
      },
      resolvedClientId: resolvedClientId || undefined,
      faceRecognitionUsable: faceRecognitionUsable || undefined,
      selectedPhotoIds,
      selectedCount,
      photographerDisplayName,
      thankYouConfig,
      lockedMessage,
      currentSelectionRound,
      selectionBatchByPhotoId: hasSelBatch ? selectionBatchByPhotoId : undefined,
      frozenSelectionPhotoIds: hasSelBatch && frozenSelectionPhotoIds.length ? frozenSelectionPhotoIds : undefined,
      immutableSelectionNotice: immutableSelectionNotice || undefined,
      deferredSignupActive: deferredSignupActive || undefined,
      salesModeActive: salesModeActive || undefined,
      salesConfig: salesModeActive ? {
        pix_enabled: !!salesConfig?.pix_enabled,
        pix_key: salesConfig?.pix_key || null,
        pix_holder_name: salesConfig?.pix_holder_name || null,
        pix_instructions: salesConfig?.pix_instructions || null,
        sales_over_limit_policy: salesConfig?.sales_over_limit_policy || 'allow_and_warn',
        sales_price_mode: salesConfig?.sales_price_mode || 'best_price_auto',
        sales_unit_price_cents: salesConfig?.sales_unit_price_cents || 0
      } : undefined,
      salesPackages: salesModeActive ? salePackages : undefined,
      salesPricing: salesModeActive ? {
        selected_count: selectedCountForPricing,
        computed_total_cents: computedTotalCents,
        over_limit_warn: overLimitWarn || undefined
      } : undefined,
      paymentState: salesModeActive ? paymentState : undefined,
      approvalsState: salesModeActive ? approvalsState : undefined,
      approvedPhotoIds: salesModeActive ? approvedPhotoIds : undefined,
      clientAuthenticated: !!cid
    });
  } finally {
    client.release();
  }
}));

router.post('/client/payment-proof', requireClient, uploadMem.single('proof'), asyncHandler(async (req, res) => {
  const slug = String(req.body?.slug || req.query?.slug || '').trim();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (slug !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });
  if (!req.file) return res.status(400).json({ message: 'Envie o comprovante.' });
  const note = req.body?.note ? String(req.body.note).trim().slice(0, 1000) : null;
  const amountCents = req.body?.amount_cents != null ? Math.max(0, parseInt(req.body.amount_cents, 10) || 0) : null;

  const client = await db.pool.connect();
  try {
    if (!(await hasTable(client, 'king_client_payment_requests'))) {
      return res.status(503).json({ message: 'Sistema de pagamento indisponível. Execute a migration 208.' });
    }
    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const gRes = await client.query(
      `SELECT id${hasAccessMode ? ', access_mode' : ''} FROM king_galleries WHERE id=$1`,
      [req.ksClient.galleryId]
    );
    if (!gRes.rows.length) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const accessMode = ksNormAccessMode(gRes.rows[0].access_mode);
    if (!ksIsPaidEventAccessMode(accessMode)) {
      return res.status(403).json({ message: 'Comprovante disponível apenas na modalidade Fotos vendidas por evento.' });
    }

    const clientId = req.ksCtx.cid ? parseInt(req.ksCtx.cid, 10) : 0;
    if (!clientId) return res.status(403).json({ message: 'Entre com sua conta antes de enviar comprovante.' });
    const round = await ksGetCurrentSelectionRound(client, req.ksClient.galleryId, clientId);
    const filePath = await ksStorePaymentProofImage(req.file, req.ksClient.galleryId, clientId, round);

    await client.query(
      `INSERT INTO king_client_payment_requests
         (gallery_id, client_id, selection_batch, payment_method, status, amount_cents, proof_file_path, note_client, created_at, updated_at)
       VALUES ($1,$2,$3,'pix','pending',$4,$5,$6,NOW(),NOW())
       ON CONFLICT (gallery_id, client_id, selection_batch)
       DO UPDATE SET status='pending', amount_cents=COALESCE(EXCLUDED.amount_cents, king_client_payment_requests.amount_cents),
                     proof_file_path=EXCLUDED.proof_file_path, note_client=EXCLUDED.note_client,
                     note_admin=NULL, reviewed_by_user_id=NULL, reviewed_at=NULL, updated_at=NOW()`,
      [req.ksClient.galleryId, clientId, round, amountCents, filePath, note]
    );

    const payment = await ksGetPaymentByClientRound(client, req.ksClient.galleryId, clientId, round);
    res.json({ success: true, payment, message: 'Comprovante enviado. Aguarde a validação do fotógrafo.' });
  } finally {
    client.release();
  }
}));

// ----- Modo sob demanda: CompareFaces + cache (não processar 2k fotos; cobra só quando o cliente envia a foto) -----
/**
 * true  (padrão): não indexa a galeria na collection; na hora da busca usa CompareFaces foto a foto → demora em galerias grandes.
 * false: modo “tipo Album”: selfie do cliente vai para a collection (IndexFaces); cada foto da galeria é processada uma vez
 * (DetectFaces + SearchFaces na collection); o visitante só lê matches no Postgres — busca rápida.
 * Em produção, para UX como outras plataformas: REKOG_ON_DEMAND=0 no Render (e S3 staging + credenciais AWS).
 */
function useRekogOnDemand() {
  const v = String(process.env.REKOG_ON_DEMAND || '1').toLowerCase();
  return v !== '0' && v !== 'false';
}

function useIndexedCompareFallback() {
  // Força fallback por comparação quando o modo indexado ainda não tem matches.
  // Em produção havia env antiga a "0", o que travava o fluxo no "aguarde indexação".
  // Mantemos possibilidade de desligar só com valor explícito "off".
  const v = String(process.env.REKOG_INDEXED_COMPARE_FALLBACK || '1').trim().toLowerCase();
  if (v === 'off') return false;
  return true;
}

function getFaceResultMinSimilarity() {
  const searchT = Math.min(100, Math.max(50, parseInt(String(process.env.REKOG_SEARCH_FACE_MATCH_THRESHOLD || '72'), 10) || 72));
  const envValue = parseInt(String(process.env.REKOG_RESULT_MIN_SIMILARITY || ''), 10);
  // Prioriza recall: em eventos reais rostos úteis podem cair <72 por luz/ângulo.
  const fallback = 65;
  if (!Number.isFinite(envValue)) return fallback;
  return Math.min(100, Math.max(50, envValue));
}

function useSessionAutoLink() {
  const raw = String(process.env.REKOG_SESSION_AUTO_LINK || '0').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function searchCacheKey(galleryId, clientId, key) {
  return `search:${galleryId}:${clientId}:${key}`;
}

const SEARCH_CACHE_TTL_DAYS = 7;

function useFaceSearchCache() {
  const raw = String(process.env.REKOG_FACE_USE_CACHE || '0').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

async function getSearchCache(pgClient, galleryId, clientId, key) {
  const ck = searchCacheKey(galleryId, clientId, key);
  const r = await pgClient.query(
    `SELECT payload_json FROM rekognition_processing_cache WHERE cache_key=$1 AND expires_at > NOW()`,
    [ck]
  );
  if (r.rows.length === 0) return null;
  try {
    const payload = JSON.parse(r.rows[0].payload_json);
    return Array.isArray(payload.photoIds) ? payload.photoIds : null;
  } catch (_) {
    return null;
  }
}

async function setSearchCache(pgClient, galleryId, clientId, key, photoIds, ttlDays = SEARCH_CACHE_TTL_DAYS) {
  const ck = searchCacheKey(galleryId, clientId, key);
  const payload = JSON.stringify({ photoIds: Array.isArray(photoIds) ? photoIds : [] });
  await pgClient.query(
    `INSERT INTO rekognition_processing_cache (cache_key, payload_json, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)
     ON CONFLICT (cache_key) DO UPDATE SET payload_json = EXCLUDED.payload_json, expires_at = EXCLUDED.expires_at`,
    [ck, payload, String(ttlDays)]
  );
}

async function deleteSearchCacheForClientSession(pgClient, galleryId, clientId) {
  const prefix = `search:${galleryId}:${clientId}:`;
  await pgClient.query('DELETE FROM rekognition_processing_cache WHERE cache_key LIKE $1', [`${prefix}%`]);
}

async function clearClientFaceMatchesForGallery(pgClient, galleryId, clientId) {
  await pgClient.query(
    `DELETE FROM rekognition_face_matches rfm
     USING rekognition_photo_faces rpf
     JOIN king_photos kp ON kp.id = rpf.photo_id
     WHERE rfm.photo_face_id = rpf.id
       AND kp.gallery_id = $1
       AND rfm.client_id = $2`,
    [galleryId, clientId]
  );
}

async function removeOldClientFacesFromCollection(pgClient, galleryId, clientId) {
  try {
    const oldRows = await pgClient.query(
      `SELECT face_id
       FROM rekognition_client_faces
       WHERE gallery_id=$1 AND client_id=$2`,
      [galleryId, clientId]
    );
    const oldFaceIds = (oldRows.rows || [])
      .map((r) => String(r.face_id || '').trim())
      .filter((id) => id && !id.startsWith('on_demand_'));
    if (!oldFaceIds.length) return;
    const out = await deleteFacesFromCollection(oldFaceIds);
    if (out.failed.length) {
      console.warn(
        `[enroll-face-image] Nem todos os faceIds antigos foram removidos da collection (g${galleryId}/c${clientId}):`,
        out.failed.length
      );
    }
  } catch (err) {
    console.warn('[enroll-face-image] deleteFacesFromCollection:', err?.message || err);
  }
}

async function tryPromoteLegacyOnDemandFace(pgClient, galleryId, clientId) {
  if (useRekogOnDemand()) return false;
  const stagingCfg = getStagingConfig();
  const rekogCfg = getRekogConfig();
  if (!stagingCfg.enabled || !rekogCfg.enabled) return false;

  const rows = (
    await pgClient.query(
      `SELECT face_id, reference_r2_key
       FROM rekognition_client_faces
       WHERE gallery_id=$1 AND client_id=$2`,
      [galleryId, clientId]
    )
  ).rows || [];
  const hasIndexedFace = rows.some((r) => String(r.face_id || '').trim() && !String(r.face_id || '').startsWith('on_demand_'));
  if (hasIndexedFace) return false;

  const ref = rows
    .map((r) => String(r.reference_r2_key || '').trim())
    .find((k) => k.toLowerCase().startsWith('staging/'));
  if (!ref) return false;

  const externalImageId = `g${galleryId}_c${clientId}`;
  let indexResult;
  try {
    indexResult = await indexFacesFromS3(stagingCfg.bucket, ref, externalImageId);
  } catch (e) {
    console.warn('[face-results] promoção on_demand -> indexed falhou:', e?.message || e);
    return false;
  }

  const faceRecords = indexResult?.FaceRecords || [];
  if (!faceRecords.length) return false;

  await deleteSearchCacheForClientSession(pgClient, galleryId, clientId);
  await pgClient.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [galleryId, clientId]);
  await clearClientFaceMatchesForGallery(pgClient, galleryId, clientId);
  for (const rec of faceRecords) {
    const faceId = rec?.Face?.FaceId;
    if (!faceId) continue;
    await pgClient.query(
      `INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
       VALUES ($1, $2, $3, $4, $5)`,
      [galleryId, clientId, faceId, rec?.Face?.ImageId || null, ref]
    );
  }

  scheduleFullGalleryReprocessAfterClientEnroll(galleryId);
  return true;
}

async function findSimilarSessionClientWithMatches(pgClient, galleryId, clientId, refBytes) {
  if (!refBytes || refBytes.length === 0) return null;
  const linkThreshold = Math.min(100, Math.max(95, parseInt(String(process.env.REKOG_SESSION_LINK_SIMILARITY || '98'), 10) || 98));
  const minPhotos = Math.max(10, parseInt(String(process.env.REKOG_SESSION_LINK_MIN_PHOTOS || '20'), 10) || 20);
  const candidates = (
    await pgClient.query(
      `SELECT c.id AS client_id, c.email, c.created_at,
              COALESCE(m.photos, 0)::int AS photos
       FROM king_gallery_clients c
       LEFT JOIN (
         SELECT rfm.client_id, COUNT(DISTINCT rpf.photo_id)::int AS photos
         FROM rekognition_face_matches rfm
         JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
         JOIN king_photos kp ON kp.id = rpf.photo_id
         WHERE kp.gallery_id=$1
         GROUP BY rfm.client_id
       ) m ON m.client_id = c.id
       WHERE c.gallery_id=$1 AND c.id <> $2
       ORDER BY c.created_at DESC
       LIMIT 12`,
      [galleryId, clientId]
    )
  ).rows || [];

  let bestClientId = null;
  let bestSimilarity = 0;
  for (const cand of candidates) {
    if (!isTechnicalFaceGalleryClientEmail(cand.email)) continue;
    const photos = parseInt(cand.photos, 10) || 0;
    if (photos < minPhotos) continue;
    const candRef = await getReferenceImageBytes(pgClient, galleryId, cand.client_id);
    if (!candRef || candRef.length === 0) continue;
    try {
      const cmp = await compareFaces(refBytes, candRef);
      const sim = Number(cmp?.FaceMatches?.[0]?.Similarity || 0);
      if (sim >= linkThreshold && sim > bestSimilarity) {
        bestSimilarity = sim;
        bestClientId = parseInt(cand.client_id, 10);
      }
    } catch (_) {
      // ignora candidato e segue
    }
  }
  return bestClientId;
}

async function copyMatchesAndWarmCacheFromSourceClient(pgClient, galleryId, sourceClientId, targetClientId, limit, offset) {
  if (!sourceClientId || !targetClientId || sourceClientId === targetClientId) {
    return { total: 0, photoIds: [], copiedRows: 0 };
  }
  const copied = await pgClient.query(
    `INSERT INTO rekognition_face_matches (photo_face_id, client_id, similarity, rekognition_face_id)
     SELECT rfm.photo_face_id, $2 AS client_id, rfm.similarity, rfm.rekognition_face_id
     FROM rekognition_face_matches rfm
     JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
     JOIN king_photos kp ON kp.id = rpf.photo_id
     WHERE kp.gallery_id = $1
       AND rfm.client_id = $3
       AND NOT EXISTS (
         SELECT 1
         FROM rekognition_face_matches x
         WHERE x.photo_face_id = rfm.photo_face_id
           AND x.client_id = $2
       )`,
    [galleryId, targetClientId, sourceClientId]
  );

  const resultMinSimilarity = getFaceResultMinSimilarity();
  const countRes = await pgClient.query(
    `SELECT COUNT(DISTINCT kp.id)::int AS cnt
     FROM king_photos kp
     JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
     JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
     WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3`,
    [galleryId, targetClientId, resultMinSimilarity]
  );
  const total = countRes.rows[0]?.cnt || 0;
  const dataRes = await pgClient.query(
    `SELECT kp.id AS photo_id
     FROM king_photos kp
     JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
     JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
     WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3
     GROUP BY kp.id
     ORDER BY MAX(rfm.similarity) DESC, kp.id
     LIMIT $4 OFFSET $5`,
    [galleryId, targetClientId, resultMinSimilarity, limit, offset]
  );
  const photoIds = dataRes.rows.map((r) => r.photo_id);
  if (photoIds.length > 0) {
    await setSearchCache(pgClient, galleryId, targetClientId, 'enroll', photoIds);
  }
  return { total, photoIds, copiedRows: copied.rowCount || 0 };
}

async function getReferenceImageBytes(pgClient, galleryId, clientId) {
  const r = await pgClient.query(
    `SELECT reference_r2_key FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2 LIMIT 1`,
    [galleryId, clientId]
  );
  const ref = r.rows[0]?.reference_r2_key;
  if (!ref) return null;
  if (String(ref).toLowerCase().startsWith('staging/')) {
    return await getStagingObject(ref);
  }
  const key = ref.startsWith('r2:') ? ref.slice(3) : ref;
  if (key && key.startsWith('galleries/')) return await fetchPhotoFileBufferFromFilePath('r2:' + key);
  return null;
}

/**
 * Compara referência do cliente contra um subconjunto de linhas king_photos (pool contínuo).
 * Usado em chunks para caber no timeout do proxy (ex.: Render ~30s).
 * @param {{ verifySourceFace?: boolean }} [opts] — se true, exige pelo menos um rosto na referência (primeiro chunk).
 */
async function compareFacesAgainstPhotoRows(sourceImageBytes, photoRows, opts = {}) {
  if (!Array.isArray(photoRows) || photoRows.length === 0) return [];
  const diag = {
    totalRows: photoRows.length,
    compareAttempts: 0,
    compareMatches: 0,
    cropFaceCandidates: 0,
    cropCompareAttempts: 0,
    cropCompareMatches: 0,
    fetchErrors: 0,
    compareErrors: 0
  };
  let sourceNorm;
  try {
    sourceNorm = await normalizeImageForRekognition(sourceImageBytes, 2048, { fast: true, quality: 84 });
  } catch (_) {
    sourceNorm = sourceImageBytes;
  }
  if (opts.verifySourceFace) {
    try {
      const rekogCfg = getRekogConfig();
      if (rekogCfg.enabled) {
        const det = await detectFacesFromBytes(sourceNorm);
        // Menos rígido no primeiro chunk para evitar falso "zero resultado" com selfie real de celular.
        const minConf = Math.min(99, Math.max(45, parseInt(String(process.env.REKOG_SOURCE_VERIFY_MIN_CONFIDENCE || '55'), 10) || 55));
        const facesOk = (det.FaceDetails || []).filter((f) => (f.Confidence || 0) >= minConf);
        if (facesOk.length === 0) return [];
      }
    } catch (_) {
      /* segue: CompareFaces pode ainda funcionar em alguns casos */
    }
  }
  const reqSpeedMode = String(opts.speedMode || process.env.REKOG_SPEED_MODE_DEFAULT || 'auto').trim().toLowerCase();
  const isFastMode = reqSpeedMode === 'fast' || reqSpeedMode === 'turbo' || reqSpeedMode === 'rapid';

  const compareMaxPx = Math.min(
    2048,
    Math.max(
      400,
      parseInt(
        String(process.env.KINGSELECTION_FACE_COMPARE_MAX_PX || (isFastMode ? '720' : '960')),
        10
      ) || (isFastMode ? 720 : 960)
    )
  );
  const photos = photoRows;
  /** Muita concorrência → ThrottlingException na AWS; o catch antigo engolia tudo e zerava resultados. */
  const baseConcurrency = Math.min(
    24,
    Math.max(
      2,
      parseInt(
        String(process.env.KINGSELECTION_FACE_COMPARE_CONCURRENCY || (isFastMode ? '10' : '8')),
        10
      ) || (isFastMode ? 10 : 8)
    )
  );
  // Em modo rápido, sobe um pouco a concorrência efetiva para reduzir tempo total por chunk.
  const concurrency = isFastMode ? Math.min(24, Math.max(2, baseConcurrency + 2)) : baseConcurrency;
  const threshold = getRekogConfig().compareSimilarityThreshold ?? getRekogConfig().faceMatchThreshold ?? 78;
  const minRelaxedThreshold = Math.min(
    95,
    Math.max(50, parseInt(String(process.env.KINGSELECTION_FACE_RELAXED_THRESHOLD || '62'), 10) || 62)
  );
  const thresholdMain = Math.max(minRelaxedThreshold, threshold);
  const thresholdFallback = Math.max(
    50,
    Math.min(thresholdMain, parseInt(String(process.env.KINGSELECTION_FACE_FALLBACK_THRESHOLD || String(Math.max(58, thresholdMain - 8))), 10) || Math.max(58, thresholdMain - 8))
  );
  const faceCropFallbackEnabled = String(process.env.KINGSELECTION_FACE_CROP_FALLBACK || '1').trim() !== '0';
  const faceCropMaxFaces = Math.min(
    12,
    Math.max(
      1,
      parseInt(
        String(process.env.KINGSELECTION_FACE_CROP_MAX_FACES || (isFastMode ? '4' : '8')),
        10
      ) || (isFastMode ? 4 : 8)
    )
  );
  const faceCropMinConfidence = Math.min(
    100,
    Math.max(0, parseInt(String(process.env.KINGSELECTION_FACE_CROP_MIN_CONFIDENCE || '45'), 10) || 45)
  );
  // Modo rápido: só aplica crop fallback pesado quando não houve match direto.
  const deferCropFallback = String(process.env.KINGSELECTION_FACE_DEFER_CROP_FALLBACK || '1').trim().toLowerCase() !== '0';
  const matchedSet = new Set();
  const directMisses = [];

  // Normaliza selfie para priorizar rosto principal (reduz falsos negativos em fotos com fundo complexo).
  let sourceCmp = sourceNorm;
  try {
    const detSrc = await detectFacesFromBytes(sourceNorm);
    const srcFaces = (detSrc.FaceDetails || [])
      .filter((f) => (f.Confidence || 0) >= faceCropMinConfidence && f.BoundingBox)
      .sort((a, b) => {
        const aa = (a.BoundingBox?.Width || 0) * (a.BoundingBox?.Height || 0);
        const bb = (b.BoundingBox?.Width || 0) * (b.BoundingBox?.Height || 0);
        return bb - aa;
      });
    if (srcFaces.length > 0) {
      const srcCrop = await cropFace(sourceNorm, srcFaces[0].BoundingBox, 0.12);
      sourceCmp = await normalizeImageForRekognition(srcCrop, 1024, { fast: true, quality: 84 });
    }
  } catch (_) {
    sourceCmp = sourceNorm;
  }

  let pi = 0;
  function nextPhoto() {
    if (pi >= photos.length) return null;
    return photos[pi++];
  }
  async function workerDirect() {
    for (;;) {
      const p = nextPhoto();
      if (!p) return;
      try {
        const buf = await fetchPhotoFileBufferFromFilePath(p.file_path);
        if (!buf || buf.length === 0) continue;
        let targetBuf;
        try {
          targetBuf = await normalizeImageForRekognition(buf, compareMaxPx, { fast: true, quality: 80 });
        } catch (_) {
          targetBuf = buf;
        }
        diag.compareAttempts += 1;
        const out = await compareFaces(sourceCmp, targetBuf);
        const matches = out.FaceMatches || [];
        if (matches.length > 0 && (matches[0].Similarity || 0) >= thresholdMain) {
          matchedSet.add(p.id);
          diag.compareMatches += 1;
          continue;
        }
        if (faceCropFallbackEnabled) {
          directMisses.push({ id: p.id, targetBuf });
        }
      } catch (_) {
        /* foto inválida / Rekognition / rede — ignora e continua */
        diag.fetchErrors += 1;
      }
    }
  }
  const nWorkers = Math.min(concurrency, Math.max(1, photos.length));
  await Promise.all(Array.from({ length: nWorkers }, () => workerDirect()));

  if (faceCropFallbackEnabled) {
    const shouldRunFallback = !deferCropFallback || matchedSet.size === 0;
    if (shouldRunFallback && directMisses.length > 0) {
      const fallbackMaxCandidates = Math.min(
        500,
        Math.max(
          1,
          parseInt(
            String(process.env.KINGSELECTION_FACE_FAST_FALLBACK_MAX_CANDIDATES || (isFastMode ? '120' : String(directMisses.length))),
            10
          ) || (isFastMode ? 120 : directMisses.length)
        )
      );
      const fallbackMisses = isFastMode && directMisses.length > fallbackMaxCandidates
        ? directMisses.slice(0, fallbackMaxCandidates)
        : directMisses;
      let mi = 0;
      const fallbackConcurrency = Math.min(Math.max(1, Math.floor(concurrency / 2)), 8);
      function nextMiss() {
        if (mi >= fallbackMisses.length) return null;
        return fallbackMisses[mi++];
      }
      async function workerFallback() {
        for (;;) {
          const miss = nextMiss();
          if (!miss) return;
          const { id, targetBuf } = miss;
          let faceDetails = [];
          try {
            const det = await detectFacesFromBytes(targetBuf);
            faceDetails = (det.FaceDetails || [])
              .filter((f) => (f.Confidence || 0) >= faceCropMinConfidence && f.BoundingBox)
              .sort((a, b) => {
                const aa = (a.BoundingBox?.Width || 0) * (a.BoundingBox?.Height || 0);
                const bb = (b.BoundingBox?.Width || 0) * (b.BoundingBox?.Height || 0);
                return bb - aa;
              })
              .slice(0, faceCropMaxFaces);
            diag.cropFaceCandidates += faceDetails.length;
          } catch (_) {
            faceDetails = [];
          }

          for (const fd of faceDetails) {
            try {
              const faceCrop = await cropFace(targetBuf, fd.BoundingBox, 0.12);
              const faceCropNorm = await normalizeImageForRekognition(faceCrop, 1024, { fast: true, quality: 84 });
              diag.cropCompareAttempts += 1;
              const outCrop = await compareFaces(sourceCmp, faceCropNorm);
              const m2 = outCrop.FaceMatches || [];
              if (m2.length > 0 && (m2[0].Similarity || 0) >= thresholdFallback) {
                matchedSet.add(id);
                diag.cropCompareMatches += 1;
                break;
              }
            } catch (_) {
              // ignora recorte inválido e segue
              diag.compareErrors += 1;
            }
          }
        }
      }
      const nFallbackWorkers = Math.min(fallbackConcurrency, Math.max(1, fallbackMisses.length));
      await Promise.all(Array.from({ length: nFallbackWorkers }, () => workerFallback()));
    }
  }
  return { photoIds: Array.from(matchedSet), diagnostics: diag };
}

async function compareFacesAgainstGallery(sourceImageBytes, galleryId, pgClient) {
  const cntRes = await pgClient.query('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id=$1', [galleryId]);
  const total = parseInt(cntRes.rows[0]?.c, 10) || 0;
  const batch = Math.min(96, Math.max(8, parseInt(String(process.env.KINGSELECTION_FACE_GALLERY_BATCH || '40'), 10) || 40));
  const matched = new Set();
  for (let skip = 0; skip < total; skip += batch) {
    const sliceRes = await pgClient.query(
      `SELECT id, file_path FROM king_photos WHERE gallery_id=$1 ORDER BY id LIMIT $2 OFFSET $3`,
      [galleryId, batch, skip]
    );
    const rows = sliceRes.rows || [];
    if (!rows.length) break;
    const part = await compareFacesAgainstPhotoRows(sourceImageBytes, rows, { verifySourceFace: skip === 0 });
    (part.photoIds || []).forEach((id) => matched.add(id));
  }
  return Array.from(matched);
}

// ===== Rekognition CLIENTE: Buscar fotos do meu rosto =====
router.get('/client/face-results', requireClient, (req, res, next) => {
  try {
    if (req.socket) req.socket.setTimeout(12 * 60 * 1000);
  } catch (_) { }
  // Evita cache 304/ETag em resultado facial (sempre dinâmico por sessão/selfie).
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, asyncHandler(async (req, res) => {
  const galleryId = req.ksClient.galleryId;
  const speedMode = String(req.query.speedMode || process.env.REKOG_SPEED_MODE_DEFAULT || 'auto').trim().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(8000, Math.max(1, parseInt(req.query.limit || '500', 10)));
  const offset = (page - 1) * limit;

  const client = await db.pool.connect();
  try {
    const clientId = await resolveFaceClientIdForSession(client, galleryId, req.ksCtx.cid, req.ksCtx.sk);
    if (!clientId) {
      return res.status(400).json({ message: 'Reconhecimento facial requer acesso individual ou uma única ficha de visitante nesta galeria. Peça ao fotógrafo.' });
    }
    if (await hasColumn(client, 'king_galleries', 'face_recognition_enabled')) {
      const ge = await client.query('SELECT face_recognition_enabled FROM king_galleries WHERE id=$1', [galleryId]);
      if (!ge.rows[0]?.face_recognition_enabled) {
        return res.status(403).json({ message: 'Reconhecimento facial está desativado nesta galeria.' });
      }
    }
    // Modo sob demanda: CompareFaces + cache (não precisa ter processado as fotos da galeria)
    if (useRekogOnDemand()) {
      if (useFaceSearchCache()) {
        const cached = await getSearchCache(client, galleryId, clientId, 'enroll');
        if (Array.isArray(cached) && cached.length > 0) {
          const total = cached.length;
          const photoIds = cached.slice(offset, offset + limit);
          return res.json({ success: true, total, photoIds, fromCache: true });
        }
      }
      const refBytes = await getReferenceImageBytes(client, galleryId, clientId);
      if (!refBytes || refBytes.length === 0) {
        return res.json({ success: true, total: 0, photoIds: [], message: 'Nenhuma foto de referência. Cadastre seu rosto primeiro.' });
      }
      /**
       * Scan completo num único pedido estoura o timeout do proxy (ex.: Render ~30s) → 502 e “CORS” no browser.
       * O cliente deve usar chunked=1 em vários GET curtos e depois POST /client/face-enroll-cache.
       */
      const chunked = String(req.query.chunked || '') === '1' || String(req.query.chunked || '').toLowerCase() === 'true';
      if (chunked) {
        const batch = Math.min(96, Math.max(8, parseInt(req.query.photoBatch || '40', 10) || 40));
        const skip = Math.max(0, parseInt(req.query.photoSkip || '0', 10) || 0);
        const cntRes = await client.query('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id=$1', [galleryId]);
        const totalGallery = parseInt(cntRes.rows[0]?.c, 10) || 0;
        const sliceRes = await client.query(
          `SELECT id, file_path FROM king_photos WHERE gallery_id=$1 ORDER BY id LIMIT $2 OFFSET $3`,
          [galleryId, batch, skip]
        );
        const rows = sliceRes.rows || [];
        const chunkRes = await compareFacesAgainstPhotoRows(refBytes, rows, { verifySourceFace: skip === 0, speedMode });
        const photoIds = chunkRes.photoIds || [];
        const hasMore = skip + rows.length < totalGallery;
        return res.json({
          success: true,
          faceChunk: true,
          photoIds,
          galleryPhotoTotal: totalGallery,
          photoSkip: skip,
          photoBatchReturned: rows.length,
          hasMore,
          total: photoIds.length,
          diagnostics: chunkRes.diagnostics || undefined
        });
      }
      // 200 (não 400): evita “failed fetch” no DevTools e falhas se o body JSON falhar parcialmente;
      // o cliente trata code FACE_USE_CHUNKED e segue para pedidos com chunked=1.
      return res.status(200).json({
        success: true,
        code: 'FACE_USE_CHUNKED',
        photoIds: [],
        total: null,
        message: 'Use análise em etapas (chunked). Atualize a página (Ctrl+F5) se a galeria estiver em cache antigo.'
      });
    }

    const resultMinSimilarity = getFaceResultMinSimilarity();
    const countRes = await client.query(
      `SELECT COUNT(DISTINCT kp.id)::int AS cnt
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3`,
      [galleryId, clientId, resultMinSimilarity]
    );
    const total = countRes.rows[0]?.cnt || 0;

    const dataRes = await client.query(
      `SELECT kp.id AS photo_id
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3
       GROUP BY kp.id
       ORDER BY MAX(rfm.similarity) DESC, kp.id
       LIMIT $4 OFFSET $5`,
      [galleryId, clientId, resultMinSimilarity, limit, offset]
    );
    const sqlPhotoIds = dataRes.rows.map((r) => r.photo_id);

    if (total > 0) {
      return res.json({
        success: true,
        total,
        photoIds: sqlPhotoIds
      });
    }

    const refBytesIndexed = await getReferenceImageBytes(client, galleryId, clientId);
    const linkedClientId = useSessionAutoLink()
      ? await findSimilarSessionClientWithMatches(client, galleryId, clientId, refBytesIndexed)
      : null;
    if (linkedClientId) {
      const relink = await copyMatchesAndWarmCacheFromSourceClient(
        client,
        galleryId,
        linkedClientId,
        clientId,
        limit,
        offset
      );
      if (relink.total > 0) {
        return res.json({
          success: true,
          total: relink.total,
          photoIds: relink.photoIds,
          relinkedFromClientId: linkedClientId,
          relinkCopiedRows: relink.copiedRows
        });
      }
    }

    const promoted = await tryPromoteLegacyOnDemandFace(client, galleryId, clientId);
    if (promoted) {
      return res.status(200).json({
        success: true,
        code: 'FACE_INDEXING_IN_PROGRESS',
        total: 0,
        photoIds: [],
        message: 'Estamos a preparar o reconhecimento desta selfie no modo rápido. Tente novamente em alguns segundos.'
      });
    }

    const cachedFallback = await getSearchCache(client, galleryId, clientId, 'enroll');
    if (cachedFallback !== null && cachedFallback.length > 0) {
      const tot = cachedFallback.length;
      const slice = cachedFallback.slice(offset, offset + limit);
      return res.json({ success: true, total: tot, photoIds: slice, fromCache: true });
    }

    if (refBytesIndexed && refBytesIndexed.length > 0 && useIndexedCompareFallback()) {
      const chunked = String(req.query.chunked || '') === '1' || String(req.query.chunked || '').toLowerCase() === 'true';
      if (chunked) {
        const batch = Math.min(96, Math.max(8, parseInt(req.query.photoBatch || '40', 10) || 40));
        const skip = Math.max(0, parseInt(req.query.photoSkip || '0', 10) || 0);
        const cntG = await client.query('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id=$1', [galleryId]);
        const totalGallery = parseInt(cntG.rows[0]?.c, 10) || 0;
        const sliceRes = await client.query(
          `SELECT id, file_path FROM king_photos WHERE gallery_id=$1 ORDER BY id LIMIT $2 OFFSET $3`,
          [galleryId, batch, skip]
        );
        const rows = sliceRes.rows || [];
        const chunkRes = await compareFacesAgainstPhotoRows(refBytesIndexed, rows, { verifySourceFace: skip === 0, speedMode });
        const chunkMatched = chunkRes.photoIds || [];
        const hasMore = skip + rows.length < totalGallery;
        return res.json({
          success: true,
          faceChunk: true,
          photoIds: chunkMatched,
          galleryPhotoTotal: totalGallery,
          photoSkip: skip,
          photoBatchReturned: rows.length,
          hasMore,
          total: chunkMatched.length,
          compareFallback: true,
          diagnostics: chunkRes.diagnostics || undefined
        });
      }
      return res.status(200).json({
        success: true,
        code: 'FACE_USE_CHUNKED',
        photoIds: [],
        total: null,
        message: 'A procurar fotos com a sua selfie (fallback).'
      });
    }

    return res.json({
      success: true,
      total: 0,
      photoIds: [],
      message: refBytesIndexed && refBytesIndexed.length > 0
        ? 'Ainda sem resultados para esta selfie. Tente outra selfie com boa luz e rosto de frente.'
        : 'Nenhuma selfie de referência ativa nesta sessão. Envie a foto novamente para iniciar a busca.'
    });
  } finally {
    client.release();
  }
}));

/** Grava cache do resultado do scan por rosto (após o cliente completar todos os chunks). */
router.post('/client/face-enroll-cache', requireClient, asyncHandler(async (req, res) => {
  const galleryId = req.ksClient.galleryId;
  let ids = (req.body && req.body.photoIds) || [];
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'photoIds deve ser um array.' });
  }
  ids = ids.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length > 25000) {
    return res.status(400).json({ success: false, message: 'Lista demasiado grande.' });
  }
  const client = await db.pool.connect();
  try {
    const clientId = await resolveFaceClientIdForSession(client, galleryId, req.ksCtx.cid, req.ksCtx.sk);
    if (!clientId) {
      return res.status(400).json({ message: 'Sem sessão válida para reconhecimento facial.' });
    }
    if (await hasColumn(client, 'king_galleries', 'face_recognition_enabled')) {
      const ge = await client.query('SELECT face_recognition_enabled FROM king_galleries WHERE id=$1', [galleryId]);
      if (!ge.rows[0]?.face_recognition_enabled) {
        return res.status(403).json({ message: 'Reconhecimento facial desativado nesta galeria.' });
      }
    }
    if (!ids.length) {
      await deleteSearchCacheForClientSession(client, galleryId, clientId);
      return res.json({ success: true, saved: 0, message: 'Cache facial vazio descartado.' });
    }
    if (!useFaceSearchCache()) {
      await deleteSearchCacheForClientSession(client, galleryId, clientId);
      return res.json({ success: true, saved: 0, message: 'Cache facial desativado.' });
    }
    await setSearchCache(client, galleryId, clientId, 'enroll', ids);
    res.json({ success: true, saved: ids.length });
  } finally {
    client.release();
  }
}));

// ===== Rekognition CLIENTE: Buscar minhas fotos por OUTRA foto (sem cadastrar de novo) =====
router.post('/client/search-face-by-photo', requireClient, uploadMem.single('image'), (req, res, next) => {
  try {
    if (req.socket) req.socket.setTimeout(12 * 60 * 1000);
  } catch (_) { }
  next();
}, asyncHandler(async (req, res) => {
  const galleryId = req.ksClient.galleryId;
  if (!req.file) return res.status(400).json({ message: 'Envie uma foto.' });

  const rekogCfg = getRekogConfig();
  if (!rekogCfg.enabled) return res.status(503).json({ message: 'Reconhecimento facial não configurado.' });

  let buffer;
  try {
    buffer = await normalizeImageForRekognition(req.file.buffer);
  } catch (e) {
    return res.status(400).json({ message: 'Imagem inválida. Tente outra foto.' });
  }

  const pgClient = await db.pool.connect();
  try {
    const clientId = await resolveFaceClientIdForSession(pgClient, galleryId, req.ksCtx.cid, req.ksCtx.sk);
    if (!clientId) {
      return res.status(400).json({ message: 'Busca por rosto requer acesso individual ou uma única ficha nesta galeria.' });
    }
    if (await hasColumn(pgClient, 'king_galleries', 'face_recognition_enabled')) {
      const ge = await pgClient.query('SELECT face_recognition_enabled FROM king_galleries WHERE id=$1', [galleryId]);
      if (!ge.rows[0]?.face_recognition_enabled) {
        return res.status(403).json({ message: 'Reconhecimento facial está desativado nesta galeria.' });
      }
    }
    // Modo sob demanda: CompareFaces + cache (não cobra de novo se a mesma foto já foi buscada)
    if (useRekogOnDemand()) {
      const imageHash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 32);
      if (useFaceSearchCache()) {
        const cached = await getSearchCache(pgClient, galleryId, clientId, imageHash);
        if (Array.isArray(cached) && cached.length > 0) {
          return res.json({ success: true, total: cached.length, photoIds: cached });
        }
      }
      const photoIds = await compareFacesAgainstGallery(buffer, galleryId, pgClient);
      if (useFaceSearchCache()) {
        await setSearchCache(pgClient, galleryId, clientId, imageHash, photoIds);
      }
      return res.json({
        success: true,
        total: photoIds.length,
        photoIds,
        message: photoIds.length === 0 ? 'Nenhum rosto parecido encontrado na galeria.' : undefined
      });
    }

    let searchResult;
    try {
      searchResult = await searchFacesByImageBytes(buffer);
    } catch (e) {
      console.error('[SearchFaceByPhoto] Rekognition:', e?.message || e);
      return res.status(503).json({ message: 'Busca temporariamente indisponível. Tente de novo.' });
    }

    const matches = searchResult.FaceMatches || [];
    const matchedFaceIds = matches.map(m => m.Face?.FaceId).filter(Boolean);
    if (matchedFaceIds.length === 0) {
      return res.json({ success: true, total: 0, photoIds: [], message: 'Nenhum rosto parecido encontrado na galeria.' });
    }

    const ours = await pgClient.query(
      `SELECT 1 FROM rekognition_client_faces
       WHERE gallery_id=$1 AND client_id=$2 AND face_id = ANY($3::varchar[]) LIMIT 1`,
      [galleryId, clientId, matchedFaceIds]
    );
    if (ours.rows.length === 0) {
      return res.json({ success: true, total: 0, photoIds: [], message: 'Esta foto não corresponde ao rosto cadastrado. Tente outra ou use "Filtrar minhas fotos".' });
    }

    const resultMinSimilarity = getFaceResultMinSimilarity();
    const countRes = await pgClient.query(
      `SELECT COUNT(DISTINCT kp.id)::int AS cnt
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3`,
      [galleryId, clientId, resultMinSimilarity]
    );
    const total = countRes.rows[0]?.cnt || 0;

    const dataRes = await pgClient.query(
      `SELECT kp.id AS photo_id
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3
       GROUP BY kp.id
       ORDER BY MAX(rfm.similarity) DESC, kp.id
       LIMIT 500`,
      [galleryId, clientId, resultMinSimilarity]
    );

    res.json({
      success: true,
      total,
      photoIds: dataRes.rows.map(r => r.photo_id)
    });
  } finally {
    pgClient.release();
  }
}));

// ===== Rekognition CLIENTE: Upload de foto para cadastro de rosto =====
router.post('/client/enroll-face-image', requireClient, uploadMem.single('image'), asyncHandler(async (req, res) => {
  const galleryId = req.ksClient.galleryId;

  if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem enviada.' });

  const stagingCfg = getStagingConfig();
  const rekogCfg = getRekogConfig();
  if (!stagingCfg.enabled || !rekogCfg.enabled) {
    return res.status(503).json({ message: 'Reconhecimento facial não configurado no servidor.' });
  }

  const client = await db.pool.connect();
  try {
    const clientId = await resolveFaceClientIdForSession(client, galleryId, req.ksCtx.cid, req.ksCtx.sk);
    if (!clientId) {
      return res.status(403).json({ message: 'Cadastro de rosto requer acesso individual ou uma única ficha de visitante nesta galeria.' });
    }
    if (await hasColumn(client, 'king_galleries', 'face_recognition_enabled')) {
      const ge = await client.query('SELECT face_recognition_enabled FROM king_galleries WHERE id=$1', [galleryId]);
      if (!ge.rows[0]?.face_recognition_enabled) {
        return res.status(403).json({ message: 'Reconhecimento facial está desativado nesta galeria.' });
      }
    }

    let buffer = await normalizeImageForRekognition(req.file.buffer);

    try {
      const det = await detectFacesFromBytes(buffer);
      const minConf = Math.min(99, Math.max(70, parseInt(String(process.env.REKOG_ENROLL_MIN_CONFIDENCE || '82'), 10) || 82));
      const facesOk = (det.FaceDetails || []).filter((f) => (f.Confidence || 0) >= minConf);
      if (facesOk.length === 0) {
        return res.status(400).json({
          message:
            'Não encontramos um rosto nítido nesta imagem. Tire uma selfie com boa luz, rosto de frente e sem óculos escuros ou boné.'
        });
      }
    } catch (detErr) {
      console.warn('[enroll-face-image] DetectFaces (referência):', detErr && detErr.message ? detErr.message : detErr);
    }

    // Modo sob demanda: salva imagem de referência no staging (não deleta); não chama IndexFaces (evita custo)
    if (useRekogOnDemand()) {
      const refStagingKey = `staging/enroll/g${galleryId}/c${clientId}.jpg`;
      await putStagingObject(refStagingKey, buffer, 'image/jpeg');
      await deleteSearchCacheForClientSession(client, galleryId, clientId);
      await client.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [galleryId, clientId]);
      await clearClientFaceMatchesForGallery(client, galleryId, clientId);
      await client.query(
        `INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
         VALUES ($1, $2, $3, NULL, $4)`,
        [galleryId, clientId, 'on_demand_' + clientId, refStagingKey]
      );
      return res.json({
        success: true,
        message: 'Rosto cadastrado. A galeria será filtrada automaticamente; buscas repetidas usam cache no servidor.',
        faceCount: 1
      });
    }

    /** Mesma chave para IndexFaces e para CompareFaces fallback (getReferenceImageBytes). Antes: só 'upload-manual' → bytes nulos → sem fallback. */
    const refStagingKey = `staging/enroll/g${galleryId}/c${clientId}.jpg`;
    await putStagingObject(refStagingKey, buffer, 'image/jpeg');
    const externalImageId = `g${galleryId}_c${clientId}`;

    let indexResult;
    try {
      indexResult = await indexFacesFromS3(stagingCfg.bucket, refStagingKey, externalImageId);
    } catch (idxErr) {
      try {
        await deleteStagingObject(refStagingKey);
      } catch (_) { /* ignore */ }
      throw idxErr;
    }

    const faceRecords = indexResult.FaceRecords || [];
    if (faceRecords.length === 0) {
      try {
        await deleteStagingObject(refStagingKey);
      } catch (_) { /* ignore */ }
      return res.status(400).json({ message: 'Nenhum rosto detectado na foto. Tente uma selfie mais nítida.' });
    }

    await removeOldClientFacesFromCollection(client, galleryId, clientId);
    await deleteSearchCacheForClientSession(client, galleryId, clientId);
    await client.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [galleryId, clientId]);
    await clearClientFaceMatchesForGallery(client, galleryId, clientId);

    for (const rec of faceRecords) {
      const faceId = rec.Face?.FaceId;
      if (!faceId) continue;
      await client.query(
        `INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
         VALUES ($1, $2, $3, $4, $5)`,
        [galleryId, clientId, faceId, rec.Face?.ImageId || null, refStagingKey]
      );
    }

    try {
      const cMeta = await client.query(
        `SELECT email FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2 LIMIT 1`,
        [clientId, galleryId]
      );
      const email = cMeta.rows[0]?.email || '';
      if (useSessionAutoLink() && isTechnicalFaceGalleryClientEmail(email)) {
        const linkedClientId = await findSimilarSessionClientWithMatches(client, galleryId, clientId, buffer);
        if (linkedClientId) {
          await copyMatchesAndWarmCacheFromSourceClient(client, galleryId, linkedClientId, clientId, 500, 0);
        }
      }
    } catch (relinkErr) {
      console.warn('[enroll-face-image] relink imediato:', relinkErr?.message || relinkErr);
    }

    scheduleFullGalleryReprocessAfterClientEnroll(galleryId);

    res.json({
      success: true,
      message:
        'Rosto cadastrado com sucesso! Estamos atualizando as fotos da galeria em segundo plano — em alguns minutos use “Só filtrar (cache)” ou atualize a página.',
      faceCount: faceRecords.length
    });
  } finally {
    client.release();
  }
}));

router.post('/client/reset-face-session', requireClient, asyncHandler(async (req, res) => {
  const galleryId = req.ksClient.galleryId;
  const client = await db.pool.connect();
  try {
    const clientId = await resolveFaceClientIdForSession(client, galleryId, req.ksCtx.cid, req.ksCtx.sk);
    if (!clientId) {
      return res.status(403).json({ message: 'Sessão facial não encontrada para este acesso.' });
    }
    await removeOldClientFacesFromCollection(client, galleryId, clientId);
    await deleteSearchCacheForClientSession(client, galleryId, clientId);
    await client.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [galleryId, clientId]);
    await clearClientFaceMatchesForGallery(client, galleryId, clientId);
    return res.json({
      success: true,
      clientId,
      message: 'Sessão facial limpa com sucesso.'
    });
  } finally {
    client.release();
  }
}));

router.post('/client/select', requireClient, asyncHandler(async (req, res) => {
  const { slug, photo_id } = req.body || {};
  if (!slug || !photo_id) return res.status(400).json({ message: 'slug e photo_id são obrigatórios.' });
  if (String(slug) !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const photoId = parseInt(photo_id, 10);
  if (!photoId) return res.status(400).json({ message: 'photo_id inválido.' });

  const client = await db.pool.connect();
  try {
    const hasAm = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const gCols = ['id', 'status'].concat(hasAm ? ['access_mode'] : []).concat(hasSelf ? ['allow_self_signup'] : []);
    const gRes = await client.query(`SELECT ${gCols.join(', ')} FROM king_galleries WHERE id=$1`, [req.ksClient.galleryId]);
    const galleryId = gRes.rows?.[0]?.id;
    if (!galleryId) return res.status(404).json({ message: 'Galeria não encontrada.' });

    const { cid, sk } = req.ksCtx;
    const locked = await ksResolveClientSelectionLocked(client, req, galleryId, gRes.rows[0]);
    if (locked) {
      return res.status(409).json({ message: 'Sua seleção já foi enviada e está em revisão. Aguarde ou peça reativação ao fotógrafo.' });
    }

    // validar que a foto pertence à galeria
    const p = await client.query('SELECT id FROM king_photos WHERE id=$1 AND gallery_id=$2', [photoId, galleryId]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada.' });

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const hasSessionKey = await hasColumn(client, 'king_selections', 'session_key');
    const round = await ksGetCurrentSelectionRound(client, galleryId, cid);
    const anonSk = sk && hasSessionKey ? sk : null;

    if (hasSelClientId) {
      if (cid) {
        const exists = await client.query(
          hasSelBatch
            ? 'SELECT id, selection_batch FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id=$3'
            : 'SELECT id FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id=$3',
          [galleryId, photoId, cid]
        );
        if (exists.rows.length) {
          if (hasSelBatch) {
            const b = parseInt(exists.rows[0].selection_batch, 10) || 1;
            if (b < round) {
              return res.status(409).json({
                message: 'Esta foto já foi confirmada numa rodada anterior e não pode ser desmarcada.'
              });
            }
          }
          await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id=$3', [galleryId, photoId, cid]);
          return res.json({ success: true, selected: false });
        }
        if (hasSelBatch) {
          await client.query(
            'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch) VALUES ($1,$2,$3,NULL,$4) ON CONFLICT DO NOTHING',
            [galleryId, photoId, cid, round]
          );
        } else {
          await client.query(
            'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente) VALUES ($1,$2,$3,NULL) ON CONFLICT DO NOTHING',
            [galleryId, photoId, cid]
          );
        }
      } else {
        const anonWhere = anonSk
          ? 'gallery_id=$1 AND photo_id=$2 AND client_id IS NULL AND session_key=$3'
          : `gallery_id=$1 AND photo_id=$2 AND client_id IS NULL${hasSessionKey ? ' AND (session_key IS NULL OR session_key = \'\')' : ''}`;
        const anonParams = anonSk ? [galleryId, photoId, anonSk] : [galleryId, photoId];
        const exists = await client.query(
          hasSelBatch
            ? `SELECT id, selection_batch FROM king_selections WHERE ${anonWhere}`
            : `SELECT id FROM king_selections WHERE ${anonWhere}`,
          anonParams
        );
        if (exists.rows.length) {
          if (hasSelBatch) {
            const b = parseInt(exists.rows[0].selection_batch, 10) || 1;
            if (b < round) {
              return res.status(409).json({
                message: 'Esta foto já foi confirmada numa rodada anterior e não pode ser desmarcada.'
              });
            }
          }
          await client.query(`DELETE FROM king_selections WHERE ${anonWhere}`, anonParams);
          return res.json({ success: true, selected: false });
        }
        if (hasSelBatch && hasSessionKey) {
          await client.query(
            anonSk
              ? 'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch, session_key) VALUES ($1,$2,NULL,NULL,$3,$4) ON CONFLICT DO NOTHING'
              : 'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch, session_key) VALUES ($1,$2,NULL,NULL,$3,NULL) ON CONFLICT DO NOTHING',
            anonSk ? [galleryId, photoId, round, anonSk] : [galleryId, photoId, round]
          );
        } else if (hasSelBatch) {
          await client.query(
            'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch) VALUES ($1,$2,NULL,NULL,$3) ON CONFLICT DO NOTHING',
            [galleryId, photoId, round]
          );
        } else if (hasSessionKey && anonSk) {
          await client.query(
            'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, session_key) VALUES ($1,$2,NULL,NULL,$3) ON CONFLICT DO NOTHING',
            [galleryId, photoId, anonSk]
          );
        } else {
          await client.query(
            'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente) VALUES ($1,$2,NULL,NULL) ON CONFLICT DO NOTHING',
            [galleryId, photoId]
          );
        }
      }
    } else {
      const exists = await client.query(
        hasSelBatch
          ? 'SELECT id, selection_batch FROM king_selections WHERE gallery_id=$1 AND photo_id=$2'
          : 'SELECT id FROM king_selections WHERE gallery_id=$1 AND photo_id=$2',
        [galleryId, photoId]
      );
      if (exists.rows.length) {
        if (hasSelBatch) {
          const b = parseInt(exists.rows[0].selection_batch, 10) || 1;
          if (b < round) {
            return res.status(409).json({
              message: 'Esta foto já foi confirmada numa rodada anterior e não pode ser desmarcada.'
            });
          }
        }
        await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id=$2', [galleryId, photoId]);
        return res.json({ success: true, selected: false });
      }
      if (hasSelBatch) {
        await client.query(
          'INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente, selection_batch) VALUES ($1,$2,NULL,$3) ON CONFLICT (gallery_id, photo_id) DO NOTHING',
          [galleryId, photoId, round]
        );
      } else {
        await client.query(
          'INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente) VALUES ($1,$2,NULL) ON CONFLICT (gallery_id, photo_id) DO NOTHING',
          [galleryId, photoId]
        );
      }
    }
    res.json(hasSelBatch ? { success: true, selected: true, selection_batch: round } : { success: true, selected: true });
  } finally {
    client.release();
  }
}));

// Seleção em massa (para "Selecionar todas" / "Limpar seleção")
router.post('/client/select-bulk', requireClient, asyncHandler(async (req, res) => {
  const { slug, mode, photo_ids } = req.body || {};
  if (!slug || !mode) return res.status(400).json({ message: 'slug e mode são obrigatórios.' });
  if (String(slug) !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });
  if (!['select', 'unselect'].includes(String(mode))) return res.status(400).json({ message: 'mode inválido.' });

  const ids = Array.isArray(photo_ids) ? photo_ids.map(x => parseInt(x, 10)).filter(Boolean) : [];
  const client = await db.pool.connect();
  try {
    const hasAm = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const gCols = ['id', 'status'].concat(hasAm ? ['access_mode'] : []).concat(hasSelf ? ['allow_self_signup'] : []);
    const gRes = await client.query(`SELECT ${gCols.join(', ')} FROM king_galleries WHERE id=$1`, [req.ksClient.galleryId]);
    const galleryId = gRes.rows?.[0]?.id;
    if (!galleryId) return res.status(404).json({ message: 'Galeria não encontrada.' });

    const { cid, sk } = req.ksCtx;
    const locked = await ksResolveClientSelectionLocked(client, req, galleryId, gRes.rows[0]);
    if (locked) {
      return res.status(409).json({ message: 'Sua seleção já foi enviada e está em revisão. Aguarde ou peça reativação ao fotógrafo.' });
    }

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
    const hasSessionKey = await hasColumn(client, 'king_selections', 'session_key');
    const round = await ksGetCurrentSelectionRound(client, galleryId, cid);
    const anonSk = sk && hasSessionKey ? sk : null;
    const legacyAnonNullSk = hasSessionKey ? ' AND (session_key IS NULL OR session_key = \'\')' : '';

    if (String(mode) === 'unselect') {
      if (hasSelClientId) {
        if (cid) {
          if (ids.length) {
            if (hasSelBatch) {
              await client.query(
                'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2 AND photo_id = ANY($3::int[]) AND selection_batch = $4',
                [galleryId, cid, ids, round]
              );
            } else {
              await client.query(
                'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2 AND photo_id = ANY($3::int[])',
                [galleryId, cid, ids]
              );
            }
          } else if (hasSelBatch) {
            await client.query(
              'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2 AND selection_batch = $3',
              [galleryId, cid, round]
            );
          } else {
            await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2', [galleryId, cid]);
          }
        } else if (ids.length) {
          if (hasSelBatch) {
            if (anonSk) {
              await client.query(
                'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND session_key=$2 AND photo_id = ANY($3::int[]) AND selection_batch = $4',
                [galleryId, anonSk, ids, round]
              );
            } else {
              await client.query(
                `DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND photo_id = ANY($2::int[]) AND selection_batch = $3${legacyAnonNullSk}`,
                [galleryId, ids, round]
              );
            }
          } else if (anonSk) {
            await client.query(
              'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND session_key=$2 AND photo_id = ANY($3::int[])',
              [galleryId, anonSk, ids]
            );
          } else {
            await client.query(
              `DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND photo_id = ANY($2::int[])${legacyAnonNullSk}`,
              [galleryId, ids]
            );
          }
        } else if (hasSelBatch) {
          if (anonSk) {
            await client.query(
              'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND session_key=$2 AND selection_batch = $3',
              [galleryId, anonSk, round]
            );
          } else {
            await client.query(
              `DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND selection_batch = $2${legacyAnonNullSk}`,
              [galleryId, round]
            );
          }
        } else if (anonSk) {
          await client.query(
            'DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND session_key=$2',
            [galleryId, anonSk]
          );
        } else {
          await client.query(
            `DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL${legacyAnonNullSk}`,
            [galleryId]
          );
        }
      } else if (ids.length) {
        if (hasSelBatch) {
          await client.query(
            'DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id = ANY($2::int[]) AND selection_batch = $3',
            [galleryId, ids, round]
          );
        } else {
          await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id = ANY($2::int[])', [galleryId, ids]);
        }
      } else if (hasSelBatch) {
        await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND selection_batch = $2', [galleryId, round]);
      } else {
        await client.query('DELETE FROM king_selections WHERE gallery_id=$1', [galleryId]);
      }
      return res.json({ success: true });
    }

    // select
    if (!ids.length) return res.json({ success: true });
    const validRes = await client.query('SELECT id FROM king_photos WHERE gallery_id=$1 AND id = ANY($2::int[])', [galleryId, ids]);
    const validIds = validRes.rows.map(r => r.id);
    if (!validIds.length) return res.json({ success: true });

    if (hasSelClientId) {
      if (cid) {
        if (hasSelBatch) {
          await client.query(
            `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch)
             SELECT $1, $2, x, NULL, $3 FROM UNNEST($4::int[]) AS x
             ON CONFLICT DO NOTHING`,
            [galleryId, cid, round, validIds]
          );
        } else {
          const values = validIds.map((pid, idx) => `($1,$2,$${idx + 3},NULL)`).join(',');
          await client.query(
            `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente)
             VALUES ${values}
             ON CONFLICT DO NOTHING`,
            [galleryId, cid, ...validIds]
          );
        }
      } else if (hasSelBatch) {
        if (hasSessionKey && anonSk) {
          await client.query(
            `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch, session_key)
             SELECT $1, NULL, x, NULL, $2, $3 FROM UNNEST($4::int[]) AS x
             ON CONFLICT DO NOTHING`,
            [galleryId, round, anonSk, validIds]
          );
        } else if (hasSessionKey) {
          await client.query(
            `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch, session_key)
             SELECT $1, NULL, x, NULL, $2, NULL FROM UNNEST($3::int[]) AS x
             ON CONFLICT DO NOTHING`,
            [galleryId, round, validIds]
          );
        } else {
          await client.query(
            `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, selection_batch)
             SELECT $1, NULL, x, NULL, $2 FROM UNNEST($3::int[]) AS x
             ON CONFLICT DO NOTHING`,
            [galleryId, round, validIds]
          );
        }
      } else if (hasSessionKey && anonSk) {
        const values = validIds.map((pid, idx) => `($1,NULL,$${idx + 2},NULL,$${validIds.length + 2})`).join(',');
        await client.query(
          `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente, session_key)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [galleryId, ...validIds, anonSk]
        );
      } else {
        const values = validIds.map((pid, idx) => `($1,NULL,$${idx + 2},NULL)`).join(',');
        await client.query(
          `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [galleryId, ...validIds]
        );
      }
    } else if (hasSelBatch) {
      await client.query(
        `INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente, selection_batch)
         SELECT $1, x, NULL, $2 FROM UNNEST($3::int[]) AS x
         ON CONFLICT (gallery_id, photo_id) DO NOTHING`,
        [galleryId, round, validIds]
      );
    } else {
      const values = validIds.map((pid, idx) => `($1,$${idx + 2},NULL)`).join(',');
      await client.query(
        `INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente)
         VALUES ${values}
         ON CONFLICT (gallery_id, photo_id) DO NOTHING`,
        [galleryId, ...validIds]
      );
    }
    res.json({ success: true });
  } finally {
    client.release();
  }
}));

router.get('/client/export', requireClient, asyncHandler(async (req, res) => {
  const slug = (req.query.slug || '').toString();
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (slug !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const client = await db.pool.connect();
  try {
    const gRes = await client.query('SELECT id, nome_projeto, slug FROM king_galleries WHERE id=$1', [req.ksClient.galleryId]);
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const gallery = gRes.rows[0];

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const hasSessionKey = await hasColumn(client, 'king_selections', 'session_key');
    const { cid, sk } = req.ksCtx;
    const anonSk = sk && hasSessionKey ? sk : null;
    const sRes = hasSelClientId
      ? (cid
        ? await client.query(
          `SELECT p.original_name
           FROM king_selections s
           JOIN king_photos p ON p.id = s.photo_id
           WHERE s.gallery_id=$1 AND s.client_id=$2
           ORDER BY p."order" ASC, p.id ASC`,
          [gallery.id, cid]
        )
        : anonSk
          ? await client.query(
            `SELECT p.original_name
             FROM king_selections s
             JOIN king_photos p ON p.id = s.photo_id
             WHERE s.gallery_id=$1 AND s.client_id IS NULL AND s.session_key=$2
             ORDER BY p."order" ASC, p.id ASC`,
            [gallery.id, anonSk]
          )
          : await client.query(
            `SELECT p.original_name
             FROM king_selections s
             JOIN king_photos p ON p.id = s.photo_id
             WHERE s.gallery_id=$1 AND s.client_id IS NULL${hasSessionKey ? ' AND (s.session_key IS NULL OR s.session_key = \'\')' : ''}
             ORDER BY p."order" ASC, p.id ASC`,
            [gallery.id]
          ))
      : await client.query(
        `SELECT p.original_name
         FROM king_selections s
         JOIN king_photos p ON p.id = s.photo_id
         WHERE s.gallery_id=$1
         ORDER BY p."order" ASC, p.id ASC`,
        [gallery.id]
      );
    const normalizeExportName = (n) => {
      let s = String(n || '').trim();
      s = s.replace(/^.*[\\/]/, '');
      const dot = s.lastIndexOf('.');
      if (dot > 0) s = s.slice(0, dot);
      return s.trim();
    };
    const names = sRes.rows.map(r => normalizeExportName(r.original_name)).filter(Boolean);

    const lightroom = names.join(', ');
    const windows = names.map(n => `"${String(n).replace(/\"/g, '')}"`).join(' OR ');

    res.json({ success: true, gallery, lightroom, windows });
  } finally {
    client.release();
  }
}));

router.post('/client/finalize', requireClient, asyncHandler(async (req, res) => {
  const { slug, feedback } = req.body || {};
  if (!slug) return res.status(400).json({ message: 'slug é obrigatório.' });
  if (String(slug) !== req.ksClient.slug) return res.status(403).json({ message: 'Sem permissão.' });

  const client = await db.pool.connect();
  try {
    const hasAmF = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasSelfF = await hasColumn(client, 'king_galleries', 'allow_self_signup');
    const gColsF = ['id', 'status'].concat(hasAmF ? ['access_mode'] : []).concat(hasSelfF ? ['allow_self_signup'] : []);
    const gRes = await client.query(`SELECT ${gColsF.join(', ')} FROM king_galleries WHERE id=$1`, [req.ksClient.galleryId]);
    const galleryId = gRes.rows?.[0]?.id;
    if (!galleryId) return res.status(404).json({ message: 'Galeria não encontrada.' });

    const hasClientTable = await hasTable(client, 'king_gallery_clients');
    const hasClientStatus = hasClientTable && (await hasColumn(client, 'king_gallery_clients', 'status'));
    const hasClientFeedback = hasClientTable && (await hasColumn(client, 'king_gallery_clients', 'feedback_cliente'));
    const { cid: ctxCid, sk } = req.ksCtx;
    let cid = ctxCid;

    const locked = await ksResolveClientSelectionLocked(client, req, galleryId, gRes.rows[0]);
    if (locked) {
      return res.status(409).json({ message: 'Sua seleção já foi enviada. Aguarde a revisão ou solicite reativação ao fotógrafo.' });
    }

    const hasSessionKeyCol = await hasColumn(client, 'king_selections', 'session_key');

    // Cadastro ao enviar: cria cliente, liga seleções anónimas e devolve novo JWT (sem pedir senha ao visitante).
    if (!cid && sk && hasSessionKeyCol) {
      const hasSelf = await hasColumn(client, 'king_galleries', 'allow_self_signup');
      const hasAm = await hasColumn(client, 'king_galleries', 'access_mode');
      const gMetaCols = ['id'].concat(hasAm ? ['access_mode'] : []).concat(hasSelf ? ['allow_self_signup'] : []);
      const gx = await client.query(`SELECT ${gMetaCols.join(', ')} FROM king_galleries WHERE id=$1`, [galleryId]);
      let am = hasAm ? String(gx.rows[0]?.access_mode || 'private').toLowerCase() : 'private';
      if (am === 'password') am = 'signup';
      const allow = hasSelf ? !!gx.rows[0]?.allow_self_signup : ksAccessModeAllowsSelfSignup(am);
      if (!ksAccessModeAllowsSelfSignup(am) || !allow) {
        return res.status(403).json({ message: 'Este envio não está disponível para esta galeria.' });
      }

      const nome = String((req.body || {}).nome || '').trim().slice(0, 255);
      const email = String((req.body || {}).email || '').trim();
      const telefone = String((req.body || {}).telefone || '').trim();
      if (!nome || !email || !telefone) {
        return res.status(400).json({ message: 'Informe nome, e-mail e telefone para enviar sua seleção.' });
      }
      const emailNorm = email.toLowerCase();

      const preCnt = await client.query(
        'SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND session_key=$2',
        [galleryId, sk]
      );
      if ((preCnt.rows[0]?.c || 0) === 0) {
        return res.status(409).json({ message: 'Nada para enviar. Sua sessão pode ter expirado — atualize a página e selecione novamente.' });
      }

      if (!hasClientTable) {
        return res.status(500).json({ message: 'Cadastro de clientes indisponível neste servidor.' });
      }

      const existingByEmail = await client.query(
        `SELECT id, nome, telefone, status, enabled FROM king_gallery_clients
         WHERE gallery_id=$1 AND lower(email)=lower($2) LIMIT 1`,
        [galleryId, emailNorm]
      );

      const pass = String(Math.floor(100000 + Math.random() * 900000));
      const senha_hash = await bcrypt.hash(pass, 10);
      const senha_enc = encryptPassword(pass);

      const hasCliTelCol = await hasColumn(client, 'king_gallery_clients', 'telefone');
      let mergeBackfillPhone = null;
      let newClientId;
      await client.query('BEGIN');
      try {
        if (existingByEmail.rows.length) {
          const ex = existingByEmail.rows[0];
          if (ex.enabled === false) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              message: 'Já existe cadastro com este e-mail, mas o acesso está desativado. Fale com o fotógrafo.'
            });
          }
          if (normKsStatus(ex.status) === 'finalizado') {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Esta seleção já foi finalizada. Fale com o fotógrafo.' });
          }
          if (ksNormClientNameMatch(ex.nome) !== ksNormClientNameMatch(nome)) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              message:
                'Este e-mail já está cadastrado com outro nome. Use os mesmos dados de quando você enviou ou entre com e-mail e senha.'
            });
          }
          if (!ksClientPhoneMatchesStored(ex.telefone, telefone)) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              message:
                'O telefone não confere com o cadastro deste e-mail. Confira o número ou entre com e-mail e senha.'
            });
          }
          if (ksShouldBackfillClientPhone(ex.telefone, telefone)) {
            mergeBackfillPhone = String(telefone).trim().slice(0, 120);
          }
          newClientId = ex.id;
        } else {
          const insC = await client.query(
            `INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),NOW())
             RETURNING id`,
            [galleryId, nome, emailNorm, telefone, senha_hash, senha_enc]
          );
          newClientId = insC.rows[0].id;
        }

        await client.query(
          'UPDATE king_selections SET client_id=$1, session_key=NULL WHERE gallery_id=$2 AND client_id IS NULL AND session_key=$3',
          [newClientId, galleryId, sk]
        );

        const hasSelBatch = await hasColumn(client, 'king_selections', 'selection_batch');
        let maxRound = 1;
        if (hasSelBatch) {
          const mr = await client.query(
            'SELECT COALESCE(MAX(selection_batch),1)::int AS m FROM king_selections WHERE gallery_id=$1 AND client_id=$2',
            [galleryId, newClientId]
          );
          maxRound = mr.rows[0]?.m || 1;
        }

        const hasCliRound = await hasColumn(client, 'king_gallery_clients', 'selection_round');
        if (hasClientStatus) {
          const parts = [];
          const vals = [];
          let i = 1;
          parts.push(`status=$${i++}`);
          vals.push('revisao');
          if (hasClientFeedback && feedback && String(feedback).trim()) {
            parts.push(`feedback_cliente=$${i++}`);
            vals.push(String(feedback).trim().slice(0, 2000));
          }
          if (hasCliRound) {
            parts.push(`selection_round=$${i++}`);
            vals.push(maxRound);
          }
          if (mergeBackfillPhone && hasCliTelCol) {
            parts.push(`telefone=$${i++}`);
            vals.push(mergeBackfillPhone);
          }
          parts.push('updated_at=NOW()');
          vals.push(galleryId, newClientId);
          await client.query(
            `UPDATE king_gallery_clients SET ${parts.join(', ')} WHERE gallery_id=$${i++} AND id=$${i}`,
            vals
          );
        }

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }

      try {
        await notifyWhatsAppSelectionFinalized({
          pgClient: client,
          galleryId,
          clientId: newClientId,
          feedback
        });
      } catch (_) { }

      const countRes = await client.query(
        'SELECT COUNT(*)::int AS cnt FROM king_selections WHERE gallery_id=$1 AND client_id=$2',
        [galleryId, newClientId]
      );
      const selectionCount = countRes.rows[0]?.cnt || 0;
      const clientDisplayName = nome;

      const DEFAULT_THANK_YOU_MESSAGE = 'Obrigado, {{nome_cliente}}! Sua seleção foi recebida com sucesso. Você escolheu {{quantidade}} foto(s). Nosso retratista {{nome}} agradece pela confiança e pelo carinho.';
      let photographerDisplayName = 'Fotógrafo';
      let projectName = null;
      let thankYouConfig = { title: 'Obrigado!', message: null, imageUrl: null };
      try {
        const hasThankYouCol = await hasColumn(client, 'king_galleries', 'thank_you_title');
        const hasThankYouNameCol = await hasColumn(client, 'king_galleries', 'thank_you_photographer_name');
        const g2 = await client.query(
          `SELECT g.nome_projeto${hasThankYouCol ? ', g.thank_you_title, g.thank_you_message, g.thank_you_image_url' : ''}${hasThankYouNameCol ? ', g.thank_you_photographer_name' : ''}
           FROM king_galleries g WHERE g.id=$1`,
          [galleryId]
        );
        if (g2.rows[0]) {
          const row = g2.rows[0];
          if (row.nome_projeto && String(row.nome_projeto).trim()) {
            projectName = String(row.nome_projeto).trim();
          }
          if (row.thank_you_photographer_name && String(row.thank_you_photographer_name).trim()) {
            photographerDisplayName = String(row.thank_you_photographer_name).trim();
          } else {
            photographerDisplayName = row.nome_projeto || photographerDisplayName;
            const nameRes = await client.query(
              `SELECT COALESCE(p.display_name, u.email, '') AS name
               FROM king_galleries g
               JOIN profile_items pi ON pi.id = g.profile_item_id
               JOIN users u ON u.id = pi.user_id
               LEFT JOIN user_profiles p ON p.user_id = u.id
               WHERE g.id=$1 LIMIT 1`,
              [galleryId]
            );
            if (nameRes.rows[0]?.name) photographerDisplayName = String(nameRes.rows[0].name).trim();
          }
          if (hasThankYouCol && row.thank_you_title !== undefined) {
            const customMessage = row.thank_you_message != null && String(row.thank_you_message).trim() ? String(row.thank_you_message).trim() : null;
            thankYouConfig = {
              title: row.thank_you_title || 'Obrigado!',
              message: customMessage || DEFAULT_THANK_YOU_MESSAGE,
              imageUrl: row.thank_you_image_url || null
            };
          } else {
            thankYouConfig = {
              title: 'Obrigado!',
              message: DEFAULT_THANK_YOU_MESSAGE,
              imageUrl: null
            };
          }
        }
      } catch (_) { }
      if (!thankYouConfig.message) thankYouConfig.message = DEFAULT_THANK_YOU_MESSAGE;

      const token = jwt.sign(
        { type: 'kingselection_client', galleryId, slug: req.ksClient.slug, clientId: newClientId, tyh: true },
        config.jwt.secret,
        { expiresIn: '14d' }
      );

      return res.json({
        success: true,
        token,
        selectionCount,
        photographerDisplayName,
        clientDisplayName,
        projectName,
        thankYouConfig
      });
    }

    // Multi-client: status/feedback por cliente (não trava a galeria inteira)
    if (cid && hasClientStatus) {
      const sets = [];
      const vals = [];
      let i = 1;
      if (hasClientFeedback && feedback && String(feedback).trim()) {
        sets.push(`feedback_cliente=$${i++}`);
        vals.push(String(feedback).trim().slice(0, 2000));
      }
      sets.push(`status=$${i++}`);
      vals.push('revisao');
      vals.push(galleryId, cid);
      await client.query(
        `UPDATE king_gallery_clients
         SET ${sets.join(', ')}, updated_at=NOW()
         WHERE gallery_id=$${i++} AND id=$${i}`,
        vals
      );
    } else {
      // Legacy: feedback global (na tabela de seleções) + trava galeria inteira
      if (feedback && String(feedback).trim()) {
        await client.query(
          'UPDATE king_selections SET feedback_cliente=$1 WHERE gallery_id=$2',
          [String(feedback).trim().slice(0, 2000), galleryId]
        );
      }
      await client.query('UPDATE king_galleries SET status=$1, updated_at=NOW() WHERE id=$2', ['revisao', galleryId]);
    }

    // Notificação WhatsApp (best-effort)
    try {
      await notifyWhatsAppSelectionFinalized({
        pgClient: client,
        galleryId,
        clientId: cid,
        feedback
      });
    } catch (_) { }

    // Contagem de fotos selecionadas (já em revisão, não muda mais)
    const countRes = await client.query(
      hasClientTable && cid
        ? 'SELECT COUNT(*)::int AS cnt FROM king_selections WHERE gallery_id=$1 AND client_id=$2'
        : 'SELECT COUNT(*)::int AS cnt FROM king_selections WHERE gallery_id=$1',
      hasClientTable && cid ? [galleryId, cid] : [galleryId]
    );
    const selectionCount = countRes.rows[0]?.cnt || 0;

    // Nome do cliente (quem selecionou as fotos) — para agradecer pelo nome
    let clientDisplayName = null;
    if (cid && hasClientTable) {
      try {
        const clientNameRes = await client.query(
          'SELECT nome FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2 LIMIT 1',
          [cid, galleryId]
        );
        if (clientNameRes.rows[0]?.nome && String(clientNameRes.rows[0].nome).trim()) {
          clientDisplayName = String(clientNameRes.rows[0].nome).trim();
        }
      } catch (_) { }
    }

    // Mensagem padrão quando o fotógrafo não personalizou (para todos)
    const DEFAULT_THANK_YOU_MESSAGE = 'Obrigado, {{nome_cliente}}! Sua seleção foi recebida com sucesso. Você escolheu {{quantidade}} foto(s). Nosso retratista {{nome}} agradece pela confiança e pelo carinho.';

    // Nome do fotógrafo, nome do projeto e config da página de obrigado
    let photographerDisplayName = 'Fotógrafo';
    let projectName = null;
    let thankYouConfig = { title: 'Obrigado!', message: null, imageUrl: null };
    try {
      const hasThankYouCol = await hasColumn(client, 'king_galleries', 'thank_you_title');
      const hasThankYouNameCol = await hasColumn(client, 'king_galleries', 'thank_you_photographer_name');
      const g2 = await client.query(
        `SELECT g.nome_projeto${hasThankYouCol ? ', g.thank_you_title, g.thank_you_message, g.thank_you_image_url' : ''}${hasThankYouNameCol ? ', g.thank_you_photographer_name' : ''}
         FROM king_galleries g WHERE g.id=$1`,
        [galleryId]
      );
      if (g2.rows[0]) {
        const row = g2.rows[0];
        if (row.nome_projeto && String(row.nome_projeto).trim()) {
          projectName = String(row.nome_projeto).trim();
        }
        if (row.thank_you_photographer_name && String(row.thank_you_photographer_name).trim()) {
          photographerDisplayName = String(row.thank_you_photographer_name).trim();
        } else {
          photographerDisplayName = row.nome_projeto || photographerDisplayName;
          const nameRes = await client.query(
            `SELECT COALESCE(p.display_name, u.email, '') AS name
             FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             JOIN users u ON u.id = pi.user_id
             LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE g.id=$1 LIMIT 1`,
            [galleryId]
          );
          if (nameRes.rows[0]?.name) photographerDisplayName = String(nameRes.rows[0].name).trim();
        }
        if (hasThankYouCol && row.thank_you_title !== undefined) {
          const customMessage = row.thank_you_message != null && String(row.thank_you_message).trim() ? String(row.thank_you_message).trim() : null;
          thankYouConfig = {
            title: row.thank_you_title || 'Obrigado!',
            message: customMessage || DEFAULT_THANK_YOU_MESSAGE,
            imageUrl: row.thank_you_image_url || null
          };
        } else {
          thankYouConfig = {
            title: 'Obrigado!',
            message: DEFAULT_THANK_YOU_MESSAGE,
            imageUrl: null
          };
        }
      }
    } catch (_) { }

    if (!thankYouConfig.message) {
      thankYouConfig.message = DEFAULT_THANK_YOU_MESSAGE;
    }

    const out = {
      success: true,
      selectionCount,
      photographerDisplayName,
      clientDisplayName,
      projectName,
      thankYouConfig
    };
    if (cid) {
      out.token = jwt.sign(
        { type: 'kingselection_client', galleryId, slug: req.ksClient.slug, clientId: cid, tyh: true },
        config.jwt.secret,
        { expiresIn: '14d' }
      );
    }
    res.json(out);
  } finally {
    client.release();
  }
}));

router.get('/client/photos/:photoId/preview', asyncHandler(async (req, res) => {
  // Token: query string (para <img src>) OU Authorization Bearer (para fetch)
  let token = (req.query.token || '').toString();
  if (!token) {
    const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    if (m) token = m[1].trim();
  }
  const payload = verifyClientToken(token);
  if (!payload) return res.status(401).send('Não autorizado');

  const slug = (req.query.slug || '').toString();
  if (slug && slug !== payload.slug) return res.status(403).send('Sem permissão');

  const photoId = parseInt(req.params.photoId, 10);
  const client = await db.pool.connect();
  try {
    const pRes = await client.query('SELECT * FROM king_photos WHERE id=$1 AND gallery_id=$2', [photoId, payload.galleryId]);
    if (pRes.rows.length === 0) return res.status(404).send('Não encontrado');
    let photo = pRes.rows[0];
    const useThumb = ['1', 'true', 'thumb', 's'].includes(String(req.query.thumb || req.query.size || '').toLowerCase());
    const isDownload = String(req.query.download || '') === '1';

    const hasAccessMode = await hasColumn(client, 'king_galleries', 'access_mode');
    const hasAllowDownload = await hasColumn(client, 'king_galleries', 'allow_download');
    const gResMeta = await client.query(
      `SELECT ${hasAccessMode ? 'access_mode,' : ''}${hasAllowDownload ? 'allow_download' : 'TRUE AS allow_download'}
       FROM king_galleries WHERE id=$1`,
      [payload.galleryId]
    );
    const accessMode = ksNormAccessMode(gResMeta.rows?.[0]?.access_mode || 'private');
    const allowDownload = !!(hasAllowDownload ? gResMeta.rows?.[0]?.allow_download : true);

    if (isDownload && !allowDownload) {
      return res.status(403).send('Download desativado para esta galeria.');
    }

    if (isDownload && ksIsPaidEventAccessMode(accessMode)) {
      const cid = parseInt(payload.clientId || 0, 10) || 0;
      if (!cid) return res.status(403).send('Faça login para baixar as fotos aprovadas.');
      if (!ksEnforceDownloadRateLimit(payload.galleryId, cid, req.ip)) {
        return res.status(429).send('Muitas tentativas de download. Tente novamente em instantes.');
      }
      if (!(await hasTable(client, 'king_selection_photo_approvals')) || !(await hasTable(client, 'king_client_payment_requests'))) {
        return res.status(503).send('Aprovação de download indisponível no servidor.');
      }

      const approvalRes = await client.query(
        `SELECT a.selection_batch, a.delivery_mode
         FROM king_selection_photo_approvals a
         JOIN king_client_payment_requests pr
           ON pr.gallery_id=a.gallery_id
          AND pr.client_id=a.client_id
          AND pr.selection_batch=a.selection_batch
         WHERE a.gallery_id=$1
           AND a.client_id=$2
           AND a.photo_id=$3
           AND lower(a.status)='approved'
           AND lower(pr.status)='confirmed'
         ORDER BY a.selection_batch DESC
         LIMIT 1`,
        [payload.galleryId, cid, photoId]
      );
      if (!approvalRes.rows.length) {
        return res.status(403).send('Foto ainda não aprovada para download.');
      }
      const ap = approvalRes.rows[0];
      const mode = ksNormDeliveryMode(ap.delivery_mode);
      const hasEditedPath = await hasColumn(client, 'king_photos', 'edited_file_path');
      if (mode === 'edited') {
        const editedPath = hasEditedPath ? String(photo.edited_file_path || '').trim() : '';
        if (!editedPath) return res.status(409).send('Versão editada ainda não foi enviada pelo fotógrafo.');
        photo = { ...photo, file_path: editedPath };
      }
      try {
        await client.query(
          `INSERT INTO king_download_audit
             (gallery_id, client_id, photo_id, selection_batch, action, ip_address, user_agent, created_at)
           VALUES ($1,$2,$3,$4,'download_clean',$5,$6,NOW())`,
          [payload.galleryId, cid, photoId, parseInt(ap.selection_batch, 10) || null, String(req.ip || '').slice(0, 100), String(req.headers['user-agent'] || '').slice(0, 400)]
        );
      } catch (_) { }
    }

    let galleryQuality = 'low';
    if (await hasColumn(client, 'king_galleries', 'client_image_quality')) {
      const gq = await client.query('SELECT client_image_quality FROM king_galleries WHERE id=$1', [payload.galleryId]);
      galleryQuality = normalizeClientImageQuality(gq.rows[0]?.client_image_quality);
    }
    const spec = getClientPreviewOutputSpec(galleryQuality, useThumb);
    const wm = (isDownload && ksIsPaidEventAccessMode(accessMode))
      ? { mode: 'none', opacity: 0, scale: 1.0, rotate: 0, logoBuffer: null }
      : await loadWatermarkForGallery(client, payload.galleryId);
    const buf = await fetchPhotoFileBufferFromFilePath(photo.file_path);
    if (!buf) return res.status(500).send('Não foi possível carregar a imagem (Cloudflare/R2 não configurado).');

    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const { width, height } = getDisplayDimensions(meta, spec.max, spec.max);
    const max = spec.max;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const out = await buildWatermarkedJpeg({
      imgBuffer: buf,
      outW,
      outH,
      watermark: wm,
      jpegOpts: { quality: spec.jpegQuality, progressive: true }
    });

    res.set('Content-Type', 'image/jpeg');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    if (isDownload) {
      res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
    } else {
      res.set('Cache-Control', 'private, max-age=' + (useThumb ? '86400' : '3600'));
    }
    if (isDownload && allowDownload) {
      const fn = (photo.original_name || `foto-${photoId}.jpg`).toString().replace(/[\/\\:*?"<>|]+/g, '-');
      res.set('Content-Disposition', `attachment; filename="${fn.endsWith('.jpg') || fn.endsWith('.jpeg') ? fn : fn + '.jpg'}"`);
    }
    res.send(out);
  } finally {
    client.release();
  }
}));

// Limpeza de órfãos no R2 (imagens/vídeos não referenciados no banco)
router.post('/cleanup-r2', protectUser, asyncHandler(async (req, res) => {
  if (!KS_WORKER_SECRET) return res.status(501).json({ message: 'Worker não configurado (KINGSELECTION_WORKER_SECRET)' });
  const rawDry = req.body?.dryRun ?? req.query?.dryRun ?? '1';
  const dryRun = rawDry === false || rawDry === 0 || String(rawDry).toLowerCase() === '0' || String(rawDry).toLowerCase() === 'false' ? false : true;
  const confirm = String(req.body?.confirm ?? req.query?.confirm ?? '').trim().toUpperCase();

  if (!dryRun && confirm !== 'SIM') {
    return res.status(400).json({
      message: 'Para deletar de verdade, envie dryRun=false e confirm="SIM"',
      dryRun: true
    });
  }

  const client = await db.pool.connect();
  const lockKey = 20260202;
  try {
    const lr = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [lockKey]);
    if (!(lr?.rows?.[0]?.locked)) {
      return res.status(409).json({ message: 'Limpeza R2 já está em execução.', dryRun });
    }
    const refSet = new Set();
    const tables = [
      { table: 'king_photos', col: 'file_path' },
      { table: 'king_galleries', col: 'watermark_path' }
    ];
    for (const t of tables) {
      if (!(await hasColumn(client, t.table, t.col))) continue;
      const r = await client.query(`SELECT ${t.col} AS v FROM ${t.table} WHERE ${t.col} IS NOT NULL AND ${t.col} != ''`);
      for (const row of r.rows) {
        const k = extractR2Key(row.v);
        if (k) refSet.add(k);
      }
    }
    const allKeys = await listR2KeysViaWorker('galleries/');
    const orphans = allKeys.filter(k => {
      const n = normalizeR2Key(k);
      return n && !refSet.has(n);
    });
    let deleted = 0;
    if (!dryRun && orphans.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < orphans.length; i += batchSize) {
        const batch = orphans.slice(i, i + batchSize);
        const out = await deleteR2BatchViaWorker(batch);
        deleted += out.deleted || 0;
      }
    }
    try { await client.query('SELECT pg_advisory_unlock($1)', [lockKey]); } catch (_) { }
    res.json({
      success: true,
      total: allKeys.length,
      referenced: refSet.size,
      orphans: orphans.length,
      deleted: dryRun ? 0 : deleted,
      dryRun
    });
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [lockKey]); } catch (_) { }
    client.release();
  }
}));

// =============================================================
// ===== RECONHECIMENTO FACIAL (Rekognition) ===================
// =============================================================

const CACHE_TTL_SECONDS = parseInt(process.env.REKOG_CACHE_TTL_SECONDS || '86400', 10); // 24h padrão

// Helper: extrai clientId do ExternalImageId = "g<galleryId>_c<clientId>"
function parseExternalImageId(externalImageId, expectedGalleryId) {
  try {
    const s = String(externalImageId || '');
    const m = s.match(/^g(\d+)_c(\d+)$/);
    if (!m) return null;
    const gId = parseInt(m[1], 10);
    const cId = parseInt(m[2], 10);
    if (gId !== expectedGalleryId) return null; // não misturar galerias
    return cId;
  } catch (_) {
    return null;
  }
}

function resolveFaceProcessingSpeedSettings(inputMode, totalPhotos) {
  const rawMode = String(inputMode || process.env.REKOG_SPEED_MODE_DEFAULT || 'auto').trim().toLowerCase();
  const requestedMode = ['auto', 'balanced', 'fast', 'ultra'].includes(rawMode) ? rawMode : 'auto';
  const photoCount = Math.max(0, parseInt(String(totalPhotos || 0), 10) || 0);
  const fastMinPhotos = Math.max(1, parseInt(String(process.env.REKOG_FAST_AUTO_MIN_PHOTOS || '1200'), 10) || 1200);
  const ultraMinPhotos = Math.max(fastMinPhotos + 1, parseInt(String(process.env.REKOG_ULTRA_AUTO_MIN_PHOTOS || '3000'), 10) || 3000);

  let effectiveMode = requestedMode;
  if (requestedMode === 'auto') {
    if (photoCount >= ultraMinPhotos) effectiveMode = 'ultra';
    else if (photoCount >= fastMinPhotos) effectiveMode = 'fast';
    else effectiveMode = 'balanced';
  }

  const presets = {
    balanced: { maxFacesToProcess: 6, minFaceAreaRatio: 0.008, minFaceConfidence: 65 },
    fast: { maxFacesToProcess: 4, minFaceAreaRatio: 0.012, minFaceConfidence: 70 },
    ultra: { maxFacesToProcess: 2, minFaceAreaRatio: 0.02, minFaceConfidence: 75 }
  };
  return {
    requestedMode,
    effectiveMode,
    ...presets[effectiveMode]
  };
}

// Helper interno: processa rostos de UMA foto (reutilizado no process-all)
async function _processPhotoFaces({ pgClient, galleryId, photoId, r2Key, photo, speedSettings }) {
  // 1. Obter ETag do R2
  let etag = 'noetag';
  try {
    const head = await r2HeadObject(r2Key);
    if (head && head.etag) etag = head.etag;
  } catch (_) { /* seguir com noetag */ }

  // 2. Montar cacheKey
  const cfg = getRekogConfig();
  const searchT = cfg.searchFaceMatchThreshold ?? cfg.faceMatchThreshold;
  const fallbackMaxFaces = Math.min(
    10,
    Math.max(1, parseInt(String(process.env.REKOG_FAST_MAX_FACES_PER_PHOTO || '3'), 10) || 3)
  );
  const fallbackMinArea = Math.min(
    0.2,
    Math.max(0, parseFloat(String(process.env.REKOG_FAST_MIN_FACE_AREA_RATIO || '0.02')) || 0.02)
  );
  const fallbackMinConfidence = Math.min(
    100,
    Math.max(0, parseFloat(String(process.env.REKOG_FAST_MIN_FACE_CONFIDENCE || '75')) || 75)
  );
  const maxFacesToProcess = Math.min(
    10,
    Math.max(1, parseInt(String(speedSettings?.maxFacesToProcess ?? fallbackMaxFaces), 10) || fallbackMaxFaces)
  );
  const minFaceAreaRatio = Math.min(
    0.2,
    Math.max(0, Number(speedSettings?.minFaceAreaRatio ?? fallbackMinArea) || fallbackMinArea)
  );
  const minFaceConfidence = Math.min(
    100,
    Math.max(0, Number(speedSettings?.minFaceConfidence ?? fallbackMinConfidence) || fallbackMinConfidence)
  );
  const speedSuffix = `ff${maxFacesToProcess}:a${minFaceAreaRatio.toFixed(3)}:c${minFaceConfidence.toFixed(1)}`;
  const cacheKey = `match:${galleryId}:${r2Key}:${etag}:t${searchT}:m${cfg.maxFacesPerImage}:${speedSuffix}`;

  // 3. Checar cache
  const cacheRes = await pgClient.query(
    `SELECT payload_json FROM rekognition_processing_cache WHERE cache_key=$1 AND expires_at > NOW()`,
    [cacheKey]
  );
  if (cacheRes.rows.length > 0) {
    const payload = JSON.parse(cacheRes.rows[0].payload_json);
    return { fromCache: true, ...payload };
  }

  // 4. Baixar imagem do R2
  let buffer = await r2GetObjectViaPublicUrl(r2Key);
  if (!buffer) buffer = await r2GetObjectBuffer(r2Key);
  if (!buffer || buffer.length === 0) {
    throw Object.assign(new Error('Não foi possível obter a imagem do R2. Verifique se o arquivo existe.'), { statusCode: 400 });
  }

  // 5. Normalizar imagem
  buffer = await normalizeImageForRekognition(buffer);

  // 6. Subir para S3 staging
  const stagingCfg = getStagingConfig();
  const stagingKey = buildStagingKey(galleryId, r2Key, 'match');
  await putStagingObject(stagingKey, buffer, 'image/jpeg');

  const resultFaces = [];
  let processError = null;

  try {
    // 7. Detectar rostos
    const detect = await detectFacesFromS3(stagingCfg.bucket, stagingKey);
    const rawFaces = detect.FaceDetails || [];
    const faces = rawFaces
      .map((face, idx) => {
        const box = face?.BoundingBox || {};
        const w = Number(box.Width || 0);
        const h = Number(box.Height || 0);
        return {
          ...face,
          _originalIndex: idx,
          _area: w > 0 && h > 0 ? (w * h) : 0
        };
      })
      .filter((face) => (face._area || 0) >= minFaceAreaRatio && (face.Confidence || 0) >= minFaceConfidence)
      .sort((a, b) => (b._area || 0) - (a._area || 0))
      .slice(0, maxFacesToProcess);

    // 8. Limpar dados antigos dessa foto
    await pgClient.query(
      `DELETE FROM rekognition_face_matches
       WHERE photo_face_id IN (SELECT id FROM rekognition_photo_faces WHERE photo_id=$1)`,
      [photoId]
    );
    await pgClient.query(
      `DELETE FROM rekognition_photo_faces WHERE photo_id=$1`,
      [photoId]
    );

    // 9. Para cada rosto: crop + SearchFaces
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const box = face.BoundingBox;
      const confidence = face.Confidence || 0;
      const faceIndex = Number.isInteger(face?._originalIndex) ? face._originalIndex : i;

      // Inserir rosto detectado
      const pfRes = await pgClient.query(
        `INSERT INTO rekognition_photo_faces (photo_id, face_index, bounding_box_json, confidence)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [photoId, faceIndex, JSON.stringify(box), confidence]
      );
      const photoFaceId = pfRes.rows[0].id;

      // Recortar rosto e buscar na collection
      const matches = [];
      try {
        const faceBuffer = await cropFace(buffer, box);
        const search = await searchFacesByImageBytes(faceBuffer);
        const faceMatches = search.FaceMatches || [];

        for (const fm of faceMatches) {
          const extId = fm.Face?.ExternalImageId;
          const clientId = parseExternalImageId(extId, galleryId);
          if (!clientId) continue; // ignorar rostos de outras galerias

          const similarity = fm.Similarity || 0;
          const rekognitionFaceId = fm.Face?.FaceId || null;

          await pgClient.query(
            `INSERT INTO rekognition_face_matches (photo_face_id, client_id, similarity, rekognition_face_id)
             VALUES ($1, $2, $3, $4)`,
            [photoFaceId, clientId, similarity, rekognitionFaceId]
          );

          matches.push({ clientId, similarity, rekognitionFaceId });
        }
      } catch (searchErr) {
        // SearchFacesByImage pode falhar se rosto for muito pequeno; continuar
        console.warn(`[rekog] searchFacesByImage falhou para face ${i} da foto ${photoId}:`, searchErr?.message);
      }

      resultFaces.push({
        index: faceIndex,
        boundingBox: box,
        confidence,
        matches
      });
    }
  } catch (err) {
    processError = err;
  } finally {
    await deleteStagingObject(stagingKey);
  }

  // 10. Atualizar rekognition_photo_jobs
  const status = processError ? 'error' : 'done';
  const errorMsg = processError ? String(processError.message || processError).slice(0, 500) : null;
  await pgClient.query(
    `INSERT INTO rekognition_photo_jobs (gallery_id, photo_id, r2_key, r2_etag, process_status, processed_at, error_message)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     ON CONFLICT (gallery_id, photo_id) DO UPDATE SET
       r2_key = EXCLUDED.r2_key,
       r2_etag = EXCLUDED.r2_etag,
       process_status = EXCLUDED.process_status,
       processed_at = EXCLUDED.processed_at,
       error_message = EXCLUDED.error_message`,
    [galleryId, photoId, r2Key, etag, status, errorMsg]
  );

  if (processError) throw processError;

  // 11. Salvar no cache
  const result = { galleryId, photoId, faces: resultFaces };
  await pgClient.query(
    `INSERT INTO rekognition_processing_cache (cache_key, payload_json, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' seconds')::interval)
     ON CONFLICT (cache_key) DO UPDATE SET payload_json = EXCLUDED.payload_json, expires_at = EXCLUDED.expires_at`,
    [cacheKey, JSON.stringify(result), String(CACHE_TTL_SECONDS)]
  );

  return { fromCache: false, ...result };
}

/**
 * Processa uma lista de fotos (Rekognition + DB). Usado em process-all-faces e após novo enroll na collection.
 */
async function runGalleryPhotosThroughRekognition(galleryId, photos, concurrency, options = {}) {
  const conc = Math.min(8, Math.max(1, concurrency || 5));
  const speedSettings = resolveFaceProcessingSpeedSettings(options.speedMode, photos.length);
  let processed = 0;
  let errors = 0;
  const totalPhotos = photos.length;
  for (let i = 0; i < photos.length; i += conc) {
    const batch = photos.slice(i, i + conc);
    const results = await Promise.allSettled(
      batch.map(async (photo) => {
        const r2Key = extractR2Key(photo.file_path);
        const batchClient = await db.pool.connect();
        try {
          if (!r2Key || !r2Key.startsWith('galleries/')) {
            await batchClient.query(
              `INSERT INTO rekognition_photo_jobs (gallery_id, photo_id, r2_key, process_status, processed_at, error_message)
               VALUES ($1, $2, '', 'error', NOW(), $3)
               ON CONFLICT (gallery_id, photo_id) DO UPDATE SET
                 process_status = 'error', processed_at = NOW(), error_message = $3`,
              [galleryId, photo.id, 'file_path sem chave R2 válida (galleries/...).']
            );
            return;
          }
          try {
            await _processPhotoFaces({ pgClient: batchClient, galleryId, photoId: photo.id, r2Key, photo, speedSettings });
          } catch (err) {
            await batchClient.query(
              `INSERT INTO rekognition_photo_jobs (gallery_id, photo_id, r2_key, process_status, processed_at, error_message)
               VALUES ($1, $2, $3, 'error', NOW(), $4)
               ON CONFLICT (gallery_id, photo_id) DO UPDATE SET
                 process_status = 'error', processed_at = NOW(), error_message = $4`,
              [galleryId, photo.id, r2Key, String(err?.message || err).slice(0, 500)]
            );
            throw err;
          }
        } finally {
          batchClient.release();
        }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') processed += 1;
      else errors += 1;
    }
    if (i % (conc * 10) === 0) {
      console.log(`[FACIAL-BATCH] Galeria ${galleryId}: ${processed}/${totalPhotos} processadas.`);
    }
  }
  return { processed, errors, totalPhotos, speedMode: speedSettings.effectiveMode };
}

/**
 * Novo rosto entrou na collection → revarrer todas as fotos para popular rekognition_face_matches (busca instantânea para o cliente).
 * Só faz sentido com REKOG_ON_DEMAND=0 (IndexFaces no enroll).
 */
function scheduleFullGalleryReprocessAfterClientEnroll(galleryId) {
  if (!galleryId) return;
  setImmediate(async () => {
    try {
      const stagingCfg = getStagingConfig();
      const rekogCfg = getRekogConfig();
      if (!stagingCfg.enabled || !rekogCfg.enabled) return;

      const client = await db.pool.connect();
      let photos;
      try {
        photos = (
          await client.query('SELECT id, file_path FROM king_photos WHERE gallery_id=$1 ORDER BY id', [galleryId])
        ).rows;
      } finally {
        client.release();
      }
      if (!photos.length) return;

      const concurrency = Math.min(
        8,
        Math.max(1, parseInt(process.env.REKOG_GALLERY_REPROCESS_CONCURRENCY || '5', 10) || 5)
      );
      console.log(
        `[FACIAL-AFTER-ENROLL] Reprocessando ${photos.length} foto(s) da galeria ${galleryId} (novo rosto na collection).`
      );
      const out = await runGalleryPhotosThroughRekognition(galleryId, photos, concurrency, {
        speedMode: process.env.REKOG_SPEED_MODE_DEFAULT || 'auto'
      });
      console.log(
        `[FACIAL-AFTER-ENROLL] Fim galeria ${galleryId}. Ciclos OK: ${out.processed}, falhas: ${out.errors}.`
      );
    } catch (e) {
      console.error('[FACIAL-AFTER-ENROLL]', e?.message || e);
    }
  });
}

/**
 * Agenda processamento facial em segundo plano para fotos recém-adicionadas.
 * Só roda se a galeria tiver face_recognition_enabled e Rekognition/S3 staging estiverem configurados.
 * Não bloqueia a resposta HTTP.
 */
function scheduleFaceProcessingForNewPhotos(galleryId, photos) {
  if (!galleryId || !Array.isArray(photos) || photos.length === 0) return;
  const list = photos.map(p => ({ id: p.id, file_path: p.file_path })).filter(p => p.id && p.file_path);
  if (!list.length) return;

  setImmediate(async () => {
    try {
      const stagingCfg = getStagingConfig();
      const rekogCfg = getRekogConfig();
      if (!stagingCfg.enabled || !rekogCfg.enabled) return;

      const client = await db.pool.connect();
      let faceEnabled = false;
      try {
        const hasCol = await hasColumn(client, 'king_galleries', 'face_recognition_enabled');
        if (!hasCol) return;
        const r = await client.query('SELECT face_recognition_enabled FROM king_galleries WHERE id=$1', [galleryId]);
        faceEnabled = !!r.rows[0]?.face_recognition_enabled;
      } finally {
        client.release();
      }
      if (!faceEnabled) return;

      const speedSettings = resolveFaceProcessingSpeedSettings(process.env.REKOG_SPEED_MODE_DEFAULT || 'auto', list.length);
      for (const photo of list) {
        const r2Key = extractR2Key(photo.file_path);
        if (!r2Key || !r2Key.startsWith('galleries/')) continue;
        const pgClient = await db.pool.connect();
        try {
          await _processPhotoFaces({ pgClient, galleryId, photoId: photo.id, r2Key, photo, speedSettings });
          console.log('[FACIAL-AUTO] Foto', photo.id, 'processada (galeria', galleryId + ')');
        } catch (err) {
          console.error('[FACIAL-AUTO] Erro ao processar foto', photo.id, ':', err?.message || err);
        } finally {
          if (pgClient) pgClient.release();
        }
      }
    } catch (e) {
      console.error('[FACIAL-AUTO] Erro:', e?.message || e);
    }
  });
}

// -----------------------------------------------------------
// Passo 1: MATCH de uma foto da galeria
// POST /api/king-selection/galleries/:galleryId/photos/:photoId/process-faces
// -----------------------------------------------------------
router.post('/galleries/:galleryId/photos/:photoId/process-faces', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  const photoId = parseInt(req.params.photoId, 10);
  if (!galleryId || galleryId <= 0 || !photoId || photoId <= 0) {
    return res.status(400).json({ message: 'galleryId e photoId devem ser inteiros positivos.' });
  }

  const stagingCfg = getStagingConfig();
  const { getRekogConfig } = require('../utils/rekognition/rekognitionService');
  const rekogCfg = getRekogConfig();
  if (!stagingCfg.enabled || !rekogCfg.enabled) {
    return res.status(503).json({ message: 'Reconhecimento facial não configurado (S3 staging ou Rekognition).' });
  }

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;

    // Verificar propriedade da galeria
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    // Buscar foto
    const photoRes = await client.query(
      'SELECT * FROM king_photos WHERE id=$1 AND gallery_id=$2',
      [photoId, galleryId]
    );
    if (photoRes.rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada.' });
    const photo = photoRes.rows[0];

    // Extrair R2 key
    const r2Key = extractR2Key(photo.file_path);
    if (!r2Key || !r2Key.startsWith('galleries/')) {
      return res.status(400).json({ message: 'file_path da foto não contém uma chave R2 válida (galleries/...).' });
    }

    const result = await _processPhotoFaces({ pgClient: client, galleryId, photoId, r2Key, photo });

    return res.json({
      success: true,
      fromCache: result.fromCache,
      galleryId: result.galleryId,
      photoId: result.photoId,
      faces: result.faces
    });
  } catch (err) {
    // Tentar registrar erro no job
    try {
      await client.query(
        `INSERT INTO rekognition_photo_jobs (gallery_id, photo_id, r2_key, r2_etag, process_status, processed_at, error_message)
         VALUES ($1, $2, '', '', 'error', NOW(), $3)
         ON CONFLICT (gallery_id, photo_id) DO UPDATE SET
           process_status = 'error', processed_at = NOW(), error_message = EXCLUDED.error_message`,
        [galleryId, photoId, String(err?.message || err).slice(0, 500)]
      );
    } catch (_) { }
    const statusCode = err?.statusCode || 500;
    return res.status(statusCode).json({ message: err?.message || 'Erro ao processar reconhecimento facial.' });
  } finally {
    client.release();
  }
}));

// -----------------------------------------------------------
// Passo 2.1: Status de processamento da galeria
// GET /api/king-selection/galleries/:galleryId/face-process-status
// -----------------------------------------------------------
router.get('/galleries/:galleryId/face-process-status', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  if (!galleryId || galleryId <= 0) return res.status(400).json({ message: 'galleryId inválido.' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    // Total de fotos
    const totalRes = await client.query(
      'SELECT COUNT(*)::int AS total FROM king_photos WHERE gallery_id=$1',
      [galleryId]
    );
    const totalPhotos = totalRes.rows[0]?.total || 0;

    const jobs = { pending: 0, processing: 0, done: 0, error: 0 };
    if (await hasTable(client, 'rekognition_photo_jobs')) {
      const jobsRes = await client.query(
        `SELECT process_status, COUNT(*)::int AS cnt
         FROM rekognition_photo_jobs
         WHERE gallery_id=$1
         GROUP BY process_status`,
        [galleryId]
      );
      for (const row of jobsRes.rows) {
        const s = row.process_status;
        if (jobs[s] !== undefined) jobs[s] = row.cnt;
      }
    }

    const onDemand = useRekogOnDemand();
    return res.json({ success: true, galleryId, totalPhotos, jobs, onDemand });
  } finally {
    client.release();
  }
}));

// -----------------------------------------------------------
// Passo 2.2: Resultados por cliente
// GET /api/king-selection/galleries/:galleryId/face-results?clientId=&page=&limit=
// -----------------------------------------------------------
router.get('/galleries/:galleryId/face-results', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  if (!galleryId || galleryId <= 0) return res.status(400).json({ message: 'galleryId inválido.' });

  const clientId = parseInt(req.query.clientId, 10) || null;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset = (page - 1) * limit;

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    let rows = [];
    let total = 0;

    if (clientId) {
      // Fotos onde o cliente foi reconhecido
      const countRes = await client.query(
        `SELECT COUNT(DISTINCT kp.id)::int AS cnt
         FROM king_photos kp
         JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
         JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
         WHERE kp.gallery_id=$1 AND rfm.client_id=$2`,
        [galleryId, clientId]
      );
      total = countRes.rows[0]?.cnt || 0;

      const dataRes = await client.query(
        `SELECT kp.id AS photo_id, kp.file_path, kp.original_name,
                MAX(rfm.similarity) AS max_similarity,
                COUNT(DISTINCT rfm.id)::int AS match_count
         FROM king_photos kp
         JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
         JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
         WHERE kp.gallery_id=$1 AND rfm.client_id=$2
         GROUP BY kp.id, kp.file_path, kp.original_name
         ORDER BY max_similarity DESC, kp.id
         LIMIT $3 OFFSET $4`,
        [galleryId, clientId, limit, offset]
      );
      rows = dataRes.rows.map(r => ({
        photoId: r.photo_id,
        filePath: r.file_path,
        originalName: r.original_name,
        publicUrl: r2PublicUrl(extractR2Key(r.file_path) || r.file_path),
        maxSimilarity: parseFloat(r.max_similarity) || null,
        matchCount: r.match_count
      }));
    } else {
      // Todas as fotos com pelo menos um match
      const countRes = await client.query(
        `SELECT COUNT(DISTINCT kp.id)::int AS cnt
         FROM king_photos kp
         JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
         JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
         WHERE kp.gallery_id=$1`,
        [galleryId]
      );
      total = countRes.rows[0]?.cnt || 0;

      const dataRes = await client.query(
        `SELECT kp.id AS photo_id, kp.file_path, kp.original_name,
                COUNT(DISTINCT rfm.client_id)::int AS client_count,
                COUNT(DISTINCT rfm.id)::int AS match_count
         FROM king_photos kp
         JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
         JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
         WHERE kp.gallery_id=$1
         GROUP BY kp.id, kp.file_path, kp.original_name
         ORDER BY kp.id
         LIMIT $2 OFFSET $3`,
        [galleryId, limit, offset]
      );
      rows = dataRes.rows.map(r => ({
        photoId: r.photo_id,
        filePath: r.file_path,
        originalName: r.original_name,
        publicUrl: r2PublicUrl(extractR2Key(r.file_path) || r.file_path),
        clientCount: r.client_count,
        matchCount: r.match_count
      }));
    }

    return res.json({
      success: true,
      galleryId,
      clientId: clientId || null,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      photos: rows
    });
  } finally {
    client.release();
  }
}));

// -----------------------------------------------------------
// Passo 2.3: Detalhe de uma foto (rostos + clientes reconhecidos)
// GET /api/king-selection/galleries/:galleryId/photos/:photoId/face-detail
// -----------------------------------------------------------
router.get('/galleries/:galleryId/photos/:photoId/face-detail', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  const photoId = parseInt(req.params.photoId, 10);
  if (!galleryId || !photoId) return res.status(400).json({ message: 'galleryId e photoId inválidos.' });

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    const photoRes = await client.query(
      'SELECT id, file_path, original_name FROM king_photos WHERE id=$1 AND gallery_id=$2',
      [photoId, galleryId]
    );
    if (photoRes.rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada.' });

    // Rostos detectados
    const facesRes = await client.query(
      `SELECT rpf.id, rpf.face_index, rpf.bounding_box_json, rpf.confidence
       FROM rekognition_photo_faces rpf
       WHERE rpf.photo_id=$1
       ORDER BY rpf.face_index`,
      [photoId]
    );

    const faces = [];
    for (const faceRow of facesRes.rows) {
      // Matches para este rosto
      const matchRes = await client.query(
        `SELECT rfm.client_id, rfm.similarity, rfm.rekognition_face_id,
                kgc.nome AS client_name, kgc.email AS client_email
         FROM rekognition_face_matches rfm
         LEFT JOIN king_gallery_clients kgc ON kgc.id = rfm.client_id
         WHERE rfm.photo_face_id=$1
         ORDER BY rfm.similarity DESC`,
        [faceRow.id]
      );

      faces.push({
        index: faceRow.face_index,
        boundingBox: faceRow.bounding_box_json ? JSON.parse(faceRow.bounding_box_json) : null,
        confidence: parseFloat(faceRow.confidence) || null,
        matches: matchRes.rows.map(m => ({
          clientId: m.client_id,
          clientName: m.client_name || null,
          clientEmail: m.client_email || null,
          similarity: parseFloat(m.similarity) || null,
          rekognitionFaceId: m.rekognition_face_id || null
        }))
      });
    }

    // Status do job
    const jobRes = await client.query(
      'SELECT process_status, processed_at, error_message FROM rekognition_photo_jobs WHERE gallery_id=$1 AND photo_id=$2',
      [galleryId, photoId]
    );
    const job = jobRes.rows[0] || null;

    return res.json({
      success: true,
      photoId,
      galleryId,
      filePath: photoRes.rows[0].file_path,
      publicUrl: r2PublicUrl(extractR2Key(photoRes.rows[0].file_path) || photoRes.rows[0].file_path),
      processStatus: job?.process_status || 'not_processed',
      processedAt: job?.processed_at || null,
      errorMessage: job?.error_message || null,
      faces
    });
  } finally {
    client.release();
  }
}));

// -----------------------------------------------------------
// Passo 3: Processar todas as fotos da galeria
// POST /api/king-selection/galleries/:galleryId/process-all-faces
// -----------------------------------------------------------
router.post('/galleries/:galleryId/process-all-faces', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.galleryId, 10);
  if (!galleryId || galleryId <= 0) return res.status(400).json({ message: 'galleryId inválido.' });

  const stagingCfg = getStagingConfig();
  const { getRekogConfig } = require('../utils/rekognition/rekognitionService');
  const rekogCfg = getRekogConfig();
  if (!stagingCfg.enabled || !rekogCfg.enabled) {
    return res.status(503).json({ message: 'Reconhecimento facial não configurado (S3 staging ou Rekognition).' });
  }

  // Opções (body pode vir como JSON ou vazio se Content-Type não for application/json)
  const forceReprocess = req.body?.forceReprocess === true || req.query?.forceReprocess === 'true';
  const concurrency = Math.min(8, Math.max(1, parseInt(req.body?.concurrency || req.query?.concurrency || '5', 10) || 5));
  const speedMode = String(req.body?.speedMode || req.query?.speedMode || process.env.REKOG_SPEED_MODE_DEFAULT || 'auto').trim().toLowerCase();

  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (own.rows.length === 0) return res.status(403).json({ message: 'Sem permissão.' });

    // Listar fotos a processar
    let photosQuery;
    if (forceReprocess) {
      // Todas as fotos
      photosQuery = await client.query(
        'SELECT id, file_path FROM king_photos WHERE gallery_id=$1 ORDER BY id',
        [galleryId]
      );
    } else {
      // Apenas fotos sem job 'done'
      photosQuery = await client.query(
        `SELECT kp.id, kp.file_path
         FROM king_photos kp
         LEFT JOIN rekognition_photo_jobs rpj ON rpj.photo_id = kp.id AND rpj.gallery_id = kp.gallery_id
         WHERE kp.gallery_id=$1
           AND (rpj.process_status IS NULL OR rpj.process_status NOT IN ('done'))
         ORDER BY kp.id`,
        [galleryId]
      );
    }

    const photos = photosQuery.rows;
    const totalPhotos = photos.length;
    client.release();

    if (totalPhotos === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma foto pendente para processar.',
        totalPhotos: 0,
        processed: 0,
        errors: 0
      });
    }

    // Processar em background (evita timeout HTTP)
    (async () => {
      console.log(`[FACIAL-BATCH] Iniciando processamento de ${totalPhotos} fotos para galeria ${galleryId}...`);
      const out = await runGalleryPhotosThroughRekognition(galleryId, photos, concurrency, { speedMode });
      console.log(
        `[FACIAL-BATCH] Fim galeria ${galleryId}. Ciclos OK: ${out.processed}, falhas: ${out.errors}. Modo: ${out.speedMode}.`
      );
    })().catch((err) => console.error(`[FACIAL-BATCH-ERR] Galeria ${galleryId}:`, err));

    return res.json({
      success: true,
      message: `Processamento de ${totalPhotos} fotos iniciado em segundo plano (modo: ${speedMode}). Acompanhe o progresso na seção "Processadas" (atualize a página ou aguarde).`,
      totalPhotos,
      speedMode,
      processed: 0,
      errors: 0
    });
  } catch (err) {
    try { client.release(); } catch (_) { }
    return res.status(500).json({ message: err?.message || 'Erro ao processar galeria.' });
  }
}));

// -----------------------------------------------------------
// Endpoint público: cliente busca suas próprias fotos
// GET /api/king-selection/public/galleries/:slug/my-photos?clientToken=...
// (clientToken = JWT gerado no login do cliente)
// -----------------------------------------------------------
router.get('/public/galleries/:slug/my-photos', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug) return res.status(400).json({ message: 'slug inválido.' });

  // Verificar token do cliente (criado no login do módulo client-auth)
  const token = String(req.query.clientToken || req.headers['x-client-token'] || '').trim();
  if (!token) return res.status(401).json({ message: 'clientToken obrigatório.' });

  let clientPayload;
  try {
    const secret = config.jwt?.secret || process.env.JWT_SECRET || '';
    clientPayload = jwt.verify(token, secret);
  } catch (_) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset = (page - 1) * limit;

  const client = await db.pool.connect();
  try {
    // Buscar galeria pelo slug
    const galRes = await client.query(
      'SELECT id FROM king_galleries WHERE slug=$1',
      [slug]
    );
    if (galRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const galleryId = galRes.rows[0].id;

    const clientId = clientPayload.clientId || clientPayload.client_id;
    if (!clientId) return res.status(401).json({ message: 'Token não contém clientId.' });

    // Verificar se o cliente pertence a esta galeria
    const cRes = await client.query(
      'SELECT id FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2 AND enabled=TRUE',
      [clientId, galleryId]
    );
    if (cRes.rows.length === 0) return res.status(403).json({ message: 'Acesso negado.' });

    // Fotos onde este cliente foi reconhecido
    const resultMinSimilarity = getFaceResultMinSimilarity();
    const countRes = await client.query(
      `SELECT COUNT(DISTINCT kp.id)::int AS cnt
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3`,
      [galleryId, clientId, resultMinSimilarity]
    );
    const total = countRes.rows[0]?.cnt || 0;

    const dataRes = await client.query(
      `SELECT kp.id AS photo_id, kp.file_path, kp.original_name,
              MAX(rfm.similarity) AS max_similarity
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2 AND rfm.similarity >= $3
       GROUP BY kp.id, kp.file_path, kp.original_name
       ORDER BY max_similarity DESC, kp.id
       LIMIT $4 OFFSET $5`,
      [galleryId, clientId, resultMinSimilarity, limit, offset]
    );

    const photos = dataRes.rows.map(r => ({
      photoId: r.photo_id,
      originalName: r.original_name,
      publicUrl: r2PublicUrl(extractR2Key(r.file_path) || r.file_path),
      maxSimilarity: parseFloat(r.max_similarity) || null
    }));

    return res.json({
      success: true,
      galleryId,
      clientId,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      photos
    });
  } finally {
    client.release();
  }
}));

module.exports = router;

// ============================================================
// PAINEL ADMIN — RECONHECIMENTO FACIAL
// Rotas: /api/king-selection/facial/*
// ============================================================

// Helper: verificar propriedade da galeria
async function _checkGalleryOwner(pgClient, galleryId, userId) {
  const r = await pgClient.query(
    `SELECT g.id, g.nome_projeto FROM king_galleries g
     JOIN profile_items pi ON pi.id = g.profile_item_id
     WHERE g.id=$1 AND pi.user_id=$2`,
    [galleryId, userId]
  );
  return r.rows[0] || null;
}

// GET /facial/status?galleryId=
const facialRouter = require('express').Router();
facialRouter.get('/status', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || 0, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId é obrigatório.' });
  const client = await db.pool.connect();
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    const totalPhotos = (await client.query('SELECT COUNT(*)::int AS n FROM king_photos WHERE gallery_id=$1', [galleryId])).rows[0]?.n || 0;

    let processedPhotos = 0, errorPhotos = 0, pendingPhotos = 0, totalFaces = 0, enrolledClients = 0;
    if (await hasTable(client, 'rekognition_photo_jobs')) {
      processedPhotos = (await client.query(
        `SELECT COUNT(*)::int AS n FROM rekognition_photo_jobs WHERE gallery_id=$1 AND process_status='done'`, [galleryId]
      )).rows[0]?.n || 0;
      errorPhotos = (await client.query(
        `SELECT COUNT(*)::int AS n FROM rekognition_photo_jobs WHERE gallery_id=$1 AND process_status='error'`, [galleryId]
      )).rows[0]?.n || 0;
      pendingPhotos = (await client.query(
        `SELECT COUNT(*)::int AS n FROM rekognition_photo_jobs WHERE gallery_id=$1 AND process_status IN ('pending','processing')`, [galleryId]
      )).rows[0]?.n || 0;
    }
    if (await hasTable(client, 'rekognition_photo_faces')) {
      totalFaces = (await client.query(
        `SELECT COUNT(*)::int AS n FROM rekognition_photo_faces rpf JOIN king_photos kp ON kp.id=rpf.photo_id WHERE kp.gallery_id=$1`, [galleryId]
      )).rows[0]?.n || 0;
    }
    if (await hasTable(client, 'rekognition_client_faces')) {
      enrolledClients = (await client.query(
        `SELECT COUNT(DISTINCT client_id)::int AS n FROM rekognition_client_faces WHERE gallery_id=$1`, [galleryId]
      )).rows[0]?.n || 0;
    }

    return res.json({
      success: true,
      galleryName: gallery.nome_projeto,
      totalPhotos,
      processedPhotos,
      errorPhotos,
      pendingPhotos,
      totalFaces,
      enrolledClients,
      rekogOnDemand: useRekogOnDemand()
    });
  } finally { client.release(); }
}));

// GET /facial/clients?galleryId=
facialRouter.get('/clients', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || 0, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId é obrigatório.' });
  const client = await db.pool.connect();
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    if (!(await hasTable(client, 'rekognition_client_faces'))) return res.json({ success: true, clients: [] });

    const r = await client.query(
      `SELECT c.id AS "clientId", c.nome, c.email,
              COUNT(rcf.id)::int AS "faceCount",
              (SELECT COUNT(DISTINCT kp.id)::int
               FROM rekognition_face_matches rfm
               JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
               JOIN king_photos kp ON kp.id = rpf.photo_id
               WHERE rfm.client_id = c.id AND kp.gallery_id = $1
              ) AS "matchCount"
       FROM king_gallery_clients c
       JOIN rekognition_client_faces rcf ON rcf.client_id = c.id AND rcf.gallery_id = $1
       WHERE c.gallery_id = $1
       GROUP BY c.id, c.nome, c.email
       ORDER BY c.nome`,
      [galleryId]
    );
    return res.json({ success: true, clients: r.rows });
  } finally { client.release(); }
}));

// GET /facial/jobs?galleryId=&limit=
facialRouter.get('/jobs', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || 0, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId é obrigatório.' });
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const client = await db.pool.connect();
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    if (!(await hasTable(client, 'rekognition_photo_jobs'))) return res.json({ success: true, jobs: [] });

    const r = await client.query(
      `SELECT rpj.photo_id AS "photoId", kp.original_name AS "photoName",
              rpj.process_status AS status, rpj.processed_at AS "processedAt",
              rpj.error_message AS "errorMessage",
              (SELECT COUNT(*)::int FROM rekognition_photo_faces WHERE photo_id=rpj.photo_id) AS "faceCount"
       FROM rekognition_photo_jobs rpj
       JOIN king_photos kp ON kp.id = rpj.photo_id
       WHERE rpj.gallery_id=$1
       ORDER BY rpj.processed_at DESC NULLS LAST, rpj.photo_id DESC
       LIMIT $2`,
      [galleryId, limit]
    );
    return res.json({ success: true, jobs: r.rows });
  } finally { client.release(); }
}));

// GET /facial/matches?galleryId=&clientId=
facialRouter.get('/matches', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || 0, 10);
  const clientId = parseInt(req.query.clientId || 0, 10);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'galleryId e clientId são obrigatórios.' });
  const client = await db.pool.connect();
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    if (!(await hasTable(client, 'rekognition_face_matches'))) return res.json({ success: true, matches: [] });

    const r = await client.query(
      `SELECT kp.id AS "photoId", kp.original_name AS "photoName",
              MAX(rfm.similarity) AS similarity
       FROM king_photos kp
       JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
       JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
       WHERE kp.gallery_id=$1 AND rfm.client_id=$2
       GROUP BY kp.id, kp.original_name
       ORDER BY similarity DESC, kp.id`,
      [galleryId, clientId]
    );
    return res.json({ success: true, matches: r.rows });
  } finally { client.release(); }
}));

// POST /facial/process?galleryId=  — dispara processamento real em background
facialRouter.post('/process', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || req.body?.galleryId || 0, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId é obrigatório.' });

  // Verificar se Rekognition está configurado
  let stagingCfg, rekogCfg;
  try {
    const { getRekogConfig } = require('../utils/rekognition/rekognitionService');
    stagingCfg = getStagingConfig();
    rekogCfg = getRekogConfig();
    if (!stagingCfg.enabled || !rekogCfg.enabled) {
      return res.status(503).json({ message: 'Reconhecimento facial não configurado. Verifique as variáveis de ambiente AWS e S3 staging.' });
    }
  } catch (e) {
    return res.status(503).json({ message: 'Serviço de reconhecimento facial indisponível: ' + e.message });
  }

  const client = await db.pool.connect();
  let photos = [];
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    if (!(await hasTable(client, 'rekognition_photo_jobs'))) {
      return res.status(503).json({ message: 'Tabelas de reconhecimento facial não encontradas. Execute as migrations.' });
    }

    // Buscar fotos ainda não processadas (ou com erro)
    const pendingRes = await client.query(
      `SELECT kp.id AS photo_id, kp.file_path
       FROM king_photos kp
       WHERE kp.gallery_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM rekognition_photo_jobs rpj
           WHERE rpj.gallery_id = $1 AND rpj.photo_id = kp.id AND rpj.process_status IN ('done', 'processing')
         )
       ORDER BY kp.id
       LIMIT 500`,
      [galleryId]
    );
    photos = pendingRes.rows;

    if (photos.length === 0) {
      return res.json({ success: true, queued: 0, message: 'Todas as fotos já foram processadas.' });
    }

    // Marcar todas como 'pending'
    await client.query(
      `INSERT INTO rekognition_photo_jobs (gallery_id, photo_id, r2_key, process_status)
       SELECT $1, kp.id, COALESCE(kp.file_path,''), 'pending'
       FROM king_photos kp WHERE kp.gallery_id=$1
         AND NOT EXISTS (SELECT 1 FROM rekognition_photo_jobs WHERE gallery_id=$1 AND photo_id=kp.id AND process_status IN ('done','processing'))
       ON CONFLICT (gallery_id, photo_id) DO UPDATE SET process_status='pending', error_message=NULL`,
      [galleryId]
    );
  } finally {
    client.release();
  }

  // Responder imediatamente e processar em background
  res.json({ success: true, queued: photos.length, message: `${photos.length} foto(s) enviadas para processamento. Acompanhe o progresso no painel.` });

  // Processar em background (não bloqueia a resposta HTTP)
  setImmediate(async () => {
    const BATCH_CONCURRENCY = 3; // processar 3 fotos por vez
    const queue = photos.slice();

    async function processOne(photo) {
      const pgClient = await db.pool.connect();
      try {
        const r2Key = extractR2Key(photo.file_path) || String(photo.file_path || '').replace(/^r2:/, '').trim();
        if (!r2Key || !r2Key.startsWith('galleries/')) {
          await pgClient.query(
            `UPDATE rekognition_photo_jobs SET process_status='error', processed_at=NOW(), error_message=$1
             WHERE gallery_id=$2 AND photo_id=$3`,
            ['file_path não contém chave R2 válida', galleryId, photo.photo_id]
          );
          return;
        }
        // Marcar como processando
        await pgClient.query(
          `UPDATE rekognition_photo_jobs SET process_status='processing' WHERE gallery_id=$1 AND photo_id=$2`,
          [galleryId, photo.photo_id]
        );
        await _processPhotoFaces({ pgClient, galleryId, photoId: photo.photo_id, r2Key, photo: { file_path: photo.file_path } });
      } catch (err) {
        try {
          await pgClient.query(
            `UPDATE rekognition_photo_jobs SET process_status='error', processed_at=NOW(), error_message=$1
             WHERE gallery_id=$2 AND photo_id=$3`,
            [String(err?.message || err).slice(0, 500), galleryId, photo.photo_id]
          );
        } catch (_) { }
      } finally {
        pgClient.release();
      }
    }

    // Pool de concorrência
    async function runPool() {
      const workers = Array.from({ length: BATCH_CONCURRENCY }, async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item) await processOne(item);
        }
      });
      await Promise.all(workers);
    }

    runPool().catch(err => console.error('[facial/process] Erro no background worker:', err?.message));
  });
}));

// GET /facial/progress?galleryId=  — progresso do processamento para polling
facialRouter.get('/progress', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || 0, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId é obrigatório.' });
  const client = await db.pool.connect();
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    const totalRes = await client.query('SELECT COUNT(*)::int AS n FROM king_photos WHERE gallery_id=$1', [galleryId]);
    const total = totalRes.rows[0]?.n || 0;

    let done = 0, processing = 0, pending = 0, error = 0;
    if (await hasTable(client, 'rekognition_photo_jobs')) {
      const jobsRes = await client.query(
        `SELECT process_status, COUNT(*)::int AS cnt FROM rekognition_photo_jobs WHERE gallery_id=$1 GROUP BY process_status`,
        [galleryId]
      );
      for (const r of jobsRes.rows) {
        if (r.process_status === 'done') done = r.cnt;
        else if (r.process_status === 'processing') processing = r.cnt;
        else if (r.process_status === 'pending') pending = r.cnt;
        else if (r.process_status === 'error') error = r.cnt;
      }
    }

    const isRunning = processing > 0 || pending > 0;
    return res.json({ success: true, total, done, processing, pending, error, isRunning, pct: total > 0 ? Math.round((done / total) * 100) : 0 });
  } finally { client.release(); }
}));

// DELETE /facial/clients/:clientId/faces?galleryId=
facialRouter.delete('/clients/:clientId/faces', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.query.galleryId || 0, 10);
  const clientId = parseInt(req.params.clientId || 0, 10);
  if (!galleryId || !clientId) return res.status(400).json({ message: 'galleryId e clientId são obrigatórios.' });
  const client = await db.pool.connect();
  try {
    const gallery = await _checkGalleryOwner(client, galleryId, req.user.userId);
    if (!gallery) return res.status(403).json({ message: 'Sem permissão.' });

    // Deletar matches
    if (await hasTable(client, 'rekognition_face_matches')) {
      await client.query('DELETE FROM rekognition_face_matches WHERE client_id=$1', [clientId]);
    }
    // Deletar rostos cadastrados
    let deleted = 0;
    if (await hasTable(client, 'rekognition_client_faces')) {
      const r = await client.query('DELETE FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2', [galleryId, clientId]);
      deleted = r.rowCount || 0;
    }
    return res.json({ success: true, deleted, message: `${deleted} rosto(s) removido(s).` });
  } finally { client.release(); }
}));

// Montar sub-router de facial no router principal
router.use('/facial', facialRouter);

// GET /facial/diagnose  — diagnóstico do ambiente (migration, envvars, banco)
facialRouter.get('/diagnose', protectUser, asyncHandler(async (req, res) => {
  const client = await db.pool.connect();
  try {
    // Verificar coluna face_recognition_enabled
    const colExists = await hasColumn(client, 'king_galleries', 'face_recognition_enabled');

    // Verificar tabelas de Rekognition
    const tables = ['rekognition_client_faces', 'rekognition_photo_jobs', 'rekognition_photo_faces', 'rekognition_face_matches'];
    const tableStatus = {};
    for (const t of tables) tableStatus[t] = await hasTable(client, t);

    // Verificar envvars (sem expor valores sensíveis)
    const env = {
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION || '(não definido)',
      S3_STAGING_BUCKET: process.env.S3_STAGING_BUCKET || '(não definido)',
      REKOGNITION_COLLECTION_ID: process.env.REKOGNITION_COLLECTION_ID || '(não definido)',
    };

    // Verificar valor atual da galleryId se fornecida
    const galleryId = parseInt(req.query.galleryId || 0, 10);
    let galleryFaceEnabled = null;
    if (galleryId && colExists) {
      const r = await client.query('SELECT face_recognition_enabled FROM king_galleries WHERE id=$1', [galleryId]);
      galleryFaceEnabled = r.rows[0]?.face_recognition_enabled ?? null;
    }

    return res.json({
      success: true,
      migration182: colExists ? '✅ Coluna face_recognition_enabled EXISTS' : '❌ Coluna face_recognition_enabled NÃO EXISTE — migration 182 não rodou',
      tables: tableStatus,
      env,
      galleryId: galleryId || null,
      galleryFaceEnabled: galleryFaceEnabled !== null ? galleryFaceEnabled : '(não verificado)'
    });
  } finally { client.release(); }
}));
