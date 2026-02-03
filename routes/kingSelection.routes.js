const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');
const fetch = require('node-fetch');
const sharp = require('sharp');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getR2Config, r2PublicUrl, r2GetObjectBuffer, r2GetObjectViaPublicUrl, r2PresignPut, r2PutObjectBuffer } = require('../utils/r2');

const router = express.Router();

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const mt = String(file?.mimetype || '').toLowerCase();
    if (mt.startsWith('image/')) return cb(null, true);
    return cb(new Error('Apenas imagens são permitidas'), false);
  }
});

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
  } catch (_) {}

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
  } catch (_) {}

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
    } catch (_) {}
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
    } catch (_) {}
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
      } catch (_) {}
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
    } catch (_) {}
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

async function fetchPhotoFileBufferFromFilePath(filePath) {
  const fp = String(filePath || '').trim();
  if (!fp) return null;
  const low = fp.toLowerCase();
  if (low.startsWith('cfimage:')) {
    const imageId = fp.slice('cfimage:'.length).trim();
    if (!imageId) return null;
    return await fetchCloudflareImageBuffer(imageId);
  }
  if (low.startsWith('r2:')) {
    const key = fp.slice('r2:'.length).trim().replace(/^\/+/, '');
    if (!key) return null;
    const cfg = getR2Config();
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
  if (!hasMode && !hasPath && !hasOpacity && !hasScale && !hasRotate) return { mode: 'x', path: null, opacity: 0.30, scale: 0.28, rotate: 0 };
  const cols = [
    hasMode ? 'watermark_mode' : `'x'::text AS watermark_mode`,
    hasPath ? 'watermark_path' : 'NULL::text AS watermark_path',
    hasOpacity ? 'watermark_opacity' : '0.30::numeric AS watermark_opacity',
    hasScale ? 'watermark_scale' : '0.28::numeric AS watermark_scale',
    hasRotate ? 'watermark_rotate' : '0::int AS watermark_rotate'
  ].join(', ');
  const res = await pgClient.query(`SELECT ${cols} FROM king_galleries WHERE id=$1`, [galleryId]);
  if (!res.rows.length) return { mode: 'x', path: null, opacity: 0.30, scale: 0.28, rotate: 0 };
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
    opacity: Number.isFinite(op) ? op : 0.30,
    scale: Number.isFinite(sc) ? sc : 0.28,
    rotate
  };
}

async function buildWatermarkedJpeg({ imgBuffer, outW, outH, watermark }) {
  const img = sharp(imgBuffer).rotate();
  // base: sempre resize inside
  let pipeline = img.resize(outW, outH, { fit: 'inside' });

  // 0) Sem marca d'água
  if (watermark && watermark.mode === 'none') {
    return pipeline.jpeg({ quality: 82 }).toBuffer();
  }

  // 1) X (default)
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
  const opDefaultX = clamp(parseFloat(watermark?.opacity), 0.0, 1.0);
  if (!watermark || watermark.mode === 'x') {
    const xOpacity = Number.isFinite(opDefaultX) ? opDefaultX : 0.30;
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: 82 }).toBuffer();
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
      const xOpacity = Number.isFinite(opDefaultX) ? opDefaultX : 0.30;
      const svg = Buffer.from(
        `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
           <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
           <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         </svg>`
      );
      pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
      return pipeline.jpeg({ quality: 82 }).toBuffer();
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
      const xOpacity = Number.isFinite(opDefaultX) ? opDefaultX : 0.30;
      const svg = Buffer.from(
        `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
           <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
           <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         </svg>`
      );
      pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
      return pipeline.jpeg({ quality: 82 }).toBuffer();
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
  // Se for tile_dense, força o padrão (ignora custom).
  const wmBufRaw = (mode === 'tile_dense') ? localDefaultBuf : (wmCloudBuf || localDefaultBuf);
  if (!wmBufRaw) {
    // fallback seguro
    const xOpacity = clamp(parseFloat(watermark?.opacity), 0.0, 1.0) || 0.30;
    const svg = Buffer.from(
      `<svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
         <line x1="0" y1="0" x2="${outW}" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
         <line x1="${outW}" y1="0" x2="0" y2="${outH}" stroke="white" stroke-opacity="${xOpacity}" stroke-width="${Math.max(3, Math.round(Math.min(outW, outH) * 0.01))}"/>
       </svg>`
    );
    pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    return pipeline.jpeg({ quality: 82 }).toBuffer();
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

  // Padrão (completa): cobre a foto inteira com a marca d’água (sem mosaico)
  if (watermark?.mode === 'tile_dense') {
    const zoom = Math.max(1.0, scale); // tamanho vira zoom (>= 1)
    const w = Math.max(1, Math.round(outW * zoom));
    const h = Math.max(1, Math.round(outH * zoom));
    let wmFull = await wmBase
      .resize({ width: w, height: h, fit: 'cover', withoutEnlargement: false })
      .png()
      .toBuffer();
    // aplica opacidade de forma compatível (não depende do composite.opacity)
    wmFull = await applyOpacityPng(wmFull, opacity);
    // centraliza/corta para o tamanho final
    const left = Math.max(0, Math.floor((w - outW) / 2));
    const top = Math.max(0, Math.floor((h - outH) / 2));
    if (w !== outW || h !== outH) {
      wmFull = await sharp(wmFull)
        .extract({ left, top, width: Math.min(outW, w), height: Math.min(outH, h) })
        .resize(outW, outH, { fit: 'fill' })
        .png()
        .toBuffer();
    }
    pipeline = pipeline.composite([{ input: wmFull, top: 0, left: 0, blend: 'over' }]);
    return pipeline.jpeg({ quality: 82 }).toBuffer();
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
  return pipeline.jpeg({ quality: 82 }).toBuffer();
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
    const payload = galleries.map(g => ({ ...g, photos: photosByGallery[g.id] || [] }));
    const payloadWithStats = payload.map(g => ({
      ...g,
      selected_count: selectionStats[g.id]?.selected_count || 0,
      feedback_cliente: selectionStats[g.id]?.feedback_cliente || null,
      photos_count: (g.photos || []).length
    }));
    res.json({ success: true, galleries: payloadWithStats });
  } finally {
    client.release();
  }
}));

router.post('/galleries', protectUser, asyncHandler(async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user.userId;
    const { profileItemId, nome_projeto, cliente_email, senha, total_fotos_contratadas, min_selections } = req.body || {};
    const pid = parseInt(profileItemId, 10);
    if (!pid || !nome_projeto || !cliente_email || !senha) {
      return res.status(400).json({ message: 'Campos obrigatórios: profileItemId, nome_projeto, cliente_email, senha' });
    }
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
    // garantir unicidade
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await client.query('SELECT 1 FROM king_galleries WHERE slug=$1', [slug]);
      if (exists.rows.length === 0) break;
      slug = `${baseSlug}-${i++}`;
    }

    // hash bcrypt via pgcrypt? Para manter simples, guardar hash bcrypt gerado no Node (bcryptjs já existe)
    const bcrypt = require('bcryptjs');
    const senha_hash = await bcrypt.hash(String(senha), 10);

    const hasMin = await hasColumn(client, 'king_galleries', 'min_selections');
    const hasEnc = await hasColumn(client, 'king_galleries', 'senha_enc');
    const minSel = parseInt(min_selections || 0, 10) || 0;
    const total = parseInt(total_fotos_contratadas || 0, 10) || 0;

    let ins;
    if (hasMin && hasEnc) {
      const senha_enc = encryptPassword(String(senha));
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, senha_enc, status, total_fotos_contratadas, min_selections)
         VALUES ($1,$2,$3,$4,$5,$6,'preparacao',$7,$8)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, senha_enc, total, minSel]
      );
    } else if (hasEnc) {
      const senha_enc = encryptPassword(String(senha));
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, senha_enc, status, total_fotos_contratadas)
         VALUES ($1,$2,$3,$4,$5,$6,'preparacao',$7)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, senha_enc, total]
      );
    } else if (hasMin) {
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas, min_selections)
         VALUES ($1,$2,$3,$4,$5,'preparacao',$6,$7)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, total, minSel]
      );
    } else {
      ins = await client.query(
        `INSERT INTO king_galleries (profile_item_id, nome_projeto, slug, cliente_email, senha_hash, status, total_fotos_contratadas)
         VALUES ($1,$2,$3,$4,$5,'preparacao',$6)
         RETURNING *`,
        [pid, nome_projeto, slug, String(cliente_email).toLowerCase(), senha_hash, total]
      );
    }

    // Retorna a senha em plaintext apenas na criação (para o fotógrafo copiar/enviar)
    // Padrão do sistema: marca d'água completa (tile_dense), sem precisar enviar arquivo
    const hasWmMode = await hasColumn(client, 'king_galleries', 'watermark_mode');
    if (hasWmMode) {
      try {
        await client.query(
          `UPDATE king_galleries
           SET watermark_mode=$1
           WHERE id=$2 AND (watermark_mode IS NULL OR watermark_mode='')`,
          ['tile_dense', ins.rows[0].id]
        );
        ins.rows[0].watermark_mode = 'tile_dense';
      } catch (_) {}
    }

    res.status(201).json({ success: true, gallery: ins.rows[0], client_password: String(senha) });
  } finally {
    client.release();
  }
}));

router.post('/galleries/:id/status', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { status } = req.body || {};
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

    await client.query('UPDATE king_galleries SET status=$1, updated_at=NOW() WHERE id=$2', [status, galleryId]);
    res.json({ success: true });
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

    try {
      const ins = await client.query(
        `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
         VALUES ($1,$2,$3,$4)
         RETURNING id, gallery_id, original_name, "order"`,
        [galleryId, file_path, original_name || 'foto', parseInt(order || 0, 10) || 0]
      );
      res.status(201).json({ success: true, photo: ins.rows[0] });
    } catch (e) {
      // Se o upload já ocorreu no Cloudflare mas o DB falhou, tentar limpar a imagem pra não ficar órfã.
      try { await deleteCloudflareImage(String(imageId)); } catch (_) {}
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

// ===== R2: upload via backend (contorna bloqueio SSL/CORS no navegador) =====
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

  const cfg = getR2Config();
  if (!cfg.enabled) return res.status(501).json({ message: 'R2 não configurado (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET).' });

  const userId = req.user.userId;
  const originalName = ((req.body && (req.body.original_name || req.body.originalName)) || req.file.originalname || 'foto').toString().slice(0, 500);
  const order = parseInt((req.body && (req.body.order || 0)) || 0, 10) || 0;

  const ext = (() => {
    const n = String(req.file.originalname || '').trim();
    const m = n.match(/\.([a-zA-Z0-9]{1,8})$/);
    if (m) return m[1].toLowerCase();
    const mt = String(req.file.mimetype || '').toLowerCase();
    if (mt.includes('png')) return 'png';
    if (mt.includes('webp')) return 'webp';
    return 'jpg';
  })();
  const key = `galleries/${galleryId}/${crypto.randomUUID()}.${ext}`;

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

    try {
      await r2PutObjectBuffer({
        key,
        body: req.file.buffer,
        contentType: req.file.mimetype || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000, immutable'
      });
    } catch (e) {
      // Mensagem clara para debug (sem expor segredos)
      const msg = (e && e.message) ? String(e.message).slice(0, 250) : 'Falha ao enviar para o R2';
      return res.status(502).json({ success: false, message: `Falha ao enviar para o R2: ${msg}` });
    }

    let ins = null;
    try {
      ins = await client.query(
        `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
         VALUES ($1,$2,$3,$4)
         RETURNING id, gallery_id, original_name, "order", file_path`,
        [galleryId, `r2:${key}`, originalName, order]
      );
    } catch (e) {
      const msg = (e && e.message) ? String(e.message).slice(0, 250) : 'Falha ao salvar no banco';
      return res.status(500).json({ success: false, message: `Falha ao registrar no banco: ${msg}` });
    }

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

  const cfg = getR2Config();
  if (!cfg.enabled) return res.status(501).json({ message: 'R2 não configurado' });

  const userId = req.user.userId;
  const originalName = ((req.body && req.body.original_name) || req.file.originalname || 'foto').toString().slice(0, 500);
  const ext = (() => {
    const m = (req.file.originalname || '').match(/\.([a-zA-Z0-9]{1,8})$/);
    if (m) return m[1].toLowerCase();
    return 'jpg';
  })();

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
    const key = `galleries/${galleryId}/${crypto.randomUUID()}.${ext}`;

    await r2PutObjectBuffer({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable'
    });

    await client.query(
      'UPDATE king_photos SET file_path=$1, original_name=$2 WHERE id=$3',
      [`r2:${key}`, originalName, photoId]
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

  const cfg = getR2Config();
  if (!cfg.enabled) return res.status(501).json({ message: 'R2 não configurado' });

  const userId = req.user.userId;
  const mt = String(req.file.mimetype || '').toLowerCase();
  const ext = mt.includes('png') ? 'png' : (mt.includes('webp') ? 'webp' : 'jpg');
  const key = `galleries/${galleryId}/watermark/logo.${ext}`;

  const client = await db.pool.connect();
  try {
    const own = await client.query(
      `SELECT g.id FROM king_galleries g
       JOIN profile_items pi ON pi.id = g.profile_item_id
       WHERE g.id=$1 AND pi.user_id=$2`,
      [galleryId, userId]
    );
    if (!own.rows.length) return res.status(403).json({ message: 'Sem permissão' });

    await r2PutObjectBuffer({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable'
    });

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

    const values = [];
    const rows = [];
    let i = 1;

    for (const it of items) {
      const key = String(it?.key || '').replace(/^\/+/, '').trim();
      const receipt = String(it?.receipt || '').trim();
      const name = String(it?.name || '').slice(0, 500) || 'foto';
      const order = parseInt(it?.order || 0, 10) || 0;

      if (!key || !receipt) continue;
      if (!key.startsWith(`galleries/${galleryId}/`)) continue;

      const payload = ksVerifyToken(receipt);
      if (!payload || payload.typ !== 'ks_receipt') continue;
      if (parseInt(payload.galleryId || 0, 10) !== galleryId) continue;
      if (String(payload.key || '') !== key) continue;

      rows.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
      values.push(galleryId, `r2:${key}`, name, order);
    }

    if (!rows.length) return res.status(400).json({ success: false, message: 'Nenhum item válido (recibo/key inválidos).' });

    const ins = await client.query(
      `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
       VALUES ${rows.join(',')}
       RETURNING id, gallery_id, original_name, "order", file_path`,
      values
    );
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

    // Inserir em batch (file_path=r2:<key>)
    const values = [];
    const rows = [];
    let i = 1;
    for (const img of list) {
      const key = String(img.key || '').replace(/^\/+/, '').trim();
      if (!key) continue;
      const originalName = String(img.name || '').slice(0, 500) || 'foto';
      const order = parseInt(img.order || 0, 10) || 0;
      rows.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
      values.push(galleryId, `r2:${key}`, originalName, order);
    }
    if (!rows.length) return res.status(400).json({ message: 'Nenhuma imagem válida.' });

    const ins = await client.query(
      `INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
       VALUES ${rows.join(',')}
       RETURNING id, gallery_id, original_name, "order", file_path`,
      values
    );

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
    if (fp.startsWith('cfimage:')) {
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

router.get('/galleries/:id', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });
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

    // Clientes (multi-client)
    let clients = [];
    if (await hasTable(client, 'king_gallery_clients')) {
      const cRes = await client.query(
        `SELECT id, nome, email, telefone, enabled, note, created_at
         FROM king_gallery_clients
         WHERE gallery_id=$1
         ORDER BY created_at ASC, id ASC`,
        [galleryId]
      );
      clients = cRes.rows || [];
    }

    const hasFav = await hasColumn(client, 'king_photos', 'is_favorite');
    const hasCover = await hasColumn(client, 'king_photos', 'is_cover');
    const cols = [
      'id',
      'gallery_id',
      'original_name',
      '"order"',
      'created_at',
      hasFav ? 'is_favorite' : 'FALSE AS is_favorite',
      hasCover ? 'is_cover' : 'FALSE AS is_cover'
    ];
    const pRes = await client.query(
      `SELECT ${cols.join(', ')}
       FROM king_photos
       WHERE gallery_id=$1
       ORDER BY "order" ASC, id ASC`,
      [galleryId]
    );
    const sRes = await client.query(
      `SELECT photo_id, feedback_cliente, created_at
       FROM king_selections
       WHERE gallery_id=$1
       ORDER BY created_at ASC`,
      [galleryId]
    );
    const selectedPhotoIds = sRes.rows.map(r => r.photo_id);
    const feedback = sRes.rows.find(r => r.feedback_cliente)?.feedback_cliente || null;
    res.json({
      success: true,
      gallery: { ...g, photos: pRes.rows, selectedPhotoIds, feedback_cliente: feedback, clients }
    });
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

    const cRes = await client.query(
      `SELECT id, nome, email, telefone, enabled, note, created_at
       FROM king_gallery_clients
       WHERE gallery_id=$1
       ORDER BY created_at ASC, id ASC`,
      [galleryId]
    );
    res.json({ success: true, clients: cRes.rows || [] });
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
    'watermark_rotate'
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
      if (key === 'is_published' || key === 'allow_download' || key === 'allow_comments' || key === 'allow_social_sharing' || key === 'allow_self_signup' || key === 'client_enabled') val = !!val;
      if (key === 'cliente_email') val = String(val || '').toLowerCase().trim();
      if (key === 'data_trabalho' && val) val = String(val).slice(0, 10);
      if (key === 'watermark_opacity') {
        const n = parseFloat(val);
        val = Number.isFinite(n) ? Math.max(0.0, Math.min(1.0, n)) : 0.30;
      }
      if (key === 'watermark_scale') {
        const n = parseFloat(val);
        val = Number.isFinite(n) ? Math.max(0.10, Math.min(5.0, n)) : 0.28;
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
      sets.push(`${key}=$${idx++}`);
      values.push(val);
    }

    if (!sets.length) return res.json({ success: true });
    values.push(galleryId);
    await client.query(`UPDATE king_galleries SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${idx}`, values);

    // Pós-update: se o watermark_path antigo era cfimage e foi removido/trocado, deletar no Cloudflare.
    const cloudflare = { attempted: false, deleted: false, skipped: false };
    if (willTouchWmPath && oldWmPath) {
      let oldId = null;
      const low = oldWmPath.toLowerCase();
      if (low.startsWith('cfimage:')) oldId = oldWmPath.slice('cfimage:'.length).trim();
      else {
        const m = oldWmPath.match(/^https?:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\//i);
        if (m && m[1]) oldId = m[1];
      }
      const next = (newWmPath == null) ? '' : String(newWmPath).trim();
      // Deleta se removeu ou se trocou para outro id
      if (oldId && (!next || next !== oldWmPath)) {
        cloudflare.attempted = true;
        try {
          cloudflare.deleted = await deleteCloudflareImage(oldId);
          if (!cloudflare.deleted) cloudflare.skipped = true;
        } catch (_) {
          cloudflare.skipped = true;
        }
      }
    }

    res.json({ success: true, cloudflare_watermark: cloudflare });
  } finally {
    client.release();
  }
}));

// ===== Admin export (Lightroom / Windows / Finder) =====
router.get('/galleries/:id/export', protectUser, asyncHandler(async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  if (!galleryId) return res.status(400).json({ message: 'galleryId inválido' });

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

    const sRes = await client.query(
      `SELECT p.original_name, s.feedback_cliente
       FROM king_selections s
       JOIN king_photos p ON p.id = s.photo_id
       WHERE s.gallery_id=$1
       ORDER BY p."order" ASC, p.id ASC`,
      [galleryId]
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
      count: names.length
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
    const width = meta.width || 1200;
    const height = meta.height || 1200;
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
    const gRes = await client.query(
      `SELECT id, nome_projeto, slug, status, total_fotos_contratadas${hasMin ? ', min_selections' : ''}${hasSelf ? ', allow_self_signup' : ''}${hasEnabled ? ', client_enabled' : ''}
       FROM king_galleries
       WHERE slug=$1`,
      [slug]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const g = gRes.rows[0];

    const pRes = await client.query('SELECT id FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC LIMIT 1', [g.id]);
    const coverPhotoId = pRes.rows.length ? pRes.rows[0].id : null;

    const totalPhotosRes = await client.query('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id=$1', [g.id]);
    const totalPhotos = totalPhotosRes.rows[0]?.c || 0;

    res.json({
      success: true,
      gallery: {
        id: g.id,
        nome_projeto: g.nome_projeto,
        slug: g.slug,
        status: g.status,
        total_fotos_contratadas: g.total_fotos_contratadas || 0,
        min_selections: hasMin ? (g.min_selections || 0) : 0,
        allow_self_signup: hasSelf ? !!g.allow_self_signup : false,
        client_enabled: hasEnabled ? !!g.client_enabled : true,
        total_photos: totalPhotos,
        cover_photo_id: coverPhotoId
      }
    });
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
    const width = meta.width || 1400;
    const height = meta.height || 900;
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

  const { is_favorite, is_cover, original_name, order } = req.body || {};

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

    // Apagar do banco primeiro
    await client.query('BEGIN');
    await client.query('DELETE FROM king_selections WHERE photo_id=$1', [photoId]);
    await client.query('DELETE FROM king_photos WHERE id=$1', [photoId]);
    await client.query('COMMIT');

    // Depois tenta apagar no Cloudflare (sem quebrar o fluxo se falhar)
    let cfAttempted = false;
    let cfDeleted = false;
    let cfSkipped = false;
    if (imageId) {
      try {
        cfAttempted = true;
        // Segurança: só apaga do Cloudflare se não houver outras referências
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
          if (!cfDeleted) {
            // sem permissão/token ou falha de API
          }
        } else {
          cfSkipped = true;
        }
      } catch (e) {
        // Ignorar: exclusão no Cloudflare é best-effort
      }
    }

    res.json({ success: true, cloudflare: { attempted: cfAttempted, deleted: cfDeleted, skipped: cfSkipped } });
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
    const width = meta.width || 2400;
    const height = meta.height || 2400;
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
          { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: c.id },
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
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug, clientId: null },
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

    try {
      await client.query(
        `INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),NOW())`,
        [g.id, nomeNorm, emailNorm, telNorm || null, senha_hash, senha_enc]
      );
    } catch (e) {
      if (String(e.message || '').toLowerCase().includes('uniq_king_gallery_clients_gallery_email')) {
        return res.status(409).json({ message: 'Já existe um cliente com este e-mail nesta galeria.' });
      }
      throw e;
    }

    const token = jwt.sign(
      { type: 'kingselection_client', galleryId: g.id, slug: g.slug },
      config.jwt.secret,
      { expiresIn: '14d' }
    );

    res.json({ success: true, token, client_password: pass });
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
    const gRes = await client.query(
      `SELECT id, nome_projeto, slug, status, total_fotos_contratadas${hasMin ? ', min_selections' : ''}${hasAllowDownload ? ', allow_download' : ''}
       FROM king_galleries
       WHERE id=$1`,
      [req.ksClient.galleryId]
    );
    if (gRes.rows.length === 0) return res.status(404).json({ message: 'Galeria não encontrada.' });
    const gallery = gRes.rows[0];

    const hasFilePath = await hasColumn(client, 'king_photos', 'file_path');
    const pRes = await client.query(
      `SELECT id, original_name, "order"${hasFilePath ? ', file_path' : ''} FROM king_photos WHERE gallery_id=$1 ORDER BY "order" ASC, id ASC`,
      [gallery.id]
    );

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    const cid = req.ksClient.clientId ? parseInt(req.ksClient.clientId, 10) : null;

    let selectedPhotoIds = [];
    if (hasSelClientId) {
      if (cid) {
        const sRes = await client.query(
          'SELECT photo_id FROM king_selections WHERE gallery_id=$1 AND client_id=$2',
          [gallery.id, cid]
        );
        selectedPhotoIds = sRes.rows.map(r => r.photo_id);
      } else {
        const sRes = await client.query(
          'SELECT photo_id FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL',
          [gallery.id]
        );
        selectedPhotoIds = sRes.rows.map(r => r.photo_id);
      }
    } else {
      // compatibilidade (antes da migração)
      const sRes = await client.query('SELECT photo_id FROM king_selections WHERE gallery_id=$1', [gallery.id]);
      selectedPhotoIds = sRes.rows.map(r => r.photo_id);
    }

    // Lock por cliente (multi-client) — fallback para status global (legacy)
    let locked = ['revisao', 'finalizado'].includes(String(gallery.status || '').toLowerCase());
    if (cid && (await hasTable(client, 'king_gallery_clients')) && (await hasColumn(client, 'king_gallery_clients', 'status'))) {
      const stRes = await client.query('SELECT status FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2', [cid, gallery.id]);
      const st = String(stRes.rows?.[0]?.status || '').toLowerCase();
      if (st) locked = ['revisao', 'finalizado'].includes(st);
    }

    const photos = (pRes.rows || []).map(p => {
      const out = { id: p.id, original_name: p.original_name, order: p.order };
      if (hasFilePath && p.file_path && String(p.file_path).toLowerCase().startsWith('r2:')) {
        const objectKey = String(p.file_path).slice(3).trim().replace(/^\/+/, '');
        if (objectKey) out.url = r2PublicUrl(objectKey) || undefined;
      }
      return out;
    });
    res.json({
      success: true,
      gallery: { ...gallery, photos, locked, allow_download: hasAllowDownload ? !!gallery.allow_download : false },
      selectedPhotoIds
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
    const gRes = await client.query('SELECT id, status FROM king_galleries WHERE id=$1', [req.ksClient.galleryId]);
    const galleryId = gRes.rows?.[0]?.id;
    const stGallery = String(gRes.rows?.[0]?.status || '').toLowerCase();
    if (!galleryId) return res.status(404).json({ message: 'Galeria não encontrada.' });

    // Lock por cliente (multi-client) — fallback para status global (legacy)
    const cid = req.ksClient.clientId ? parseInt(req.ksClient.clientId, 10) : null;
    let locked = ['revisao', 'finalizado'].includes(stGallery);
    if (cid && (await hasTable(client, 'king_gallery_clients')) && (await hasColumn(client, 'king_gallery_clients', 'status'))) {
      const stRes = await client.query('SELECT status FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2', [cid, galleryId]);
      const st = String(stRes.rows?.[0]?.status || '').toLowerCase();
      if (st) locked = ['revisao', 'finalizado'].includes(st);
    }
    if (locked) {
      return res.status(409).json({ message: 'Sua seleção já foi enviada e está em revisão. Aguarde ou peça reativação ao fotógrafo.' });
    }

    // validar que a foto pertence à galeria
    const p = await client.query('SELECT id FROM king_photos WHERE id=$1 AND gallery_id=$2', [photoId, galleryId]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada.' });

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');
    if (hasSelClientId) {
      // multi-client: separar por client_id; legacy: client_id NULL
      if (cid) {
        const exists = await client.query(
          'SELECT id FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id=$3',
          [galleryId, photoId, cid]
        );
        if (exists.rows.length) {
          await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id=$3', [galleryId, photoId, cid]);
          return res.json({ success: true, selected: false });
        }
        await client.query(
          'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente) VALUES ($1,$2,$3,NULL) ON CONFLICT DO NOTHING',
          [galleryId, photoId, cid]
        );
      } else {
        const exists = await client.query(
          'SELECT id FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id IS NULL',
          [galleryId, photoId]
        );
        if (exists.rows.length) {
          await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id=$2 AND client_id IS NULL', [galleryId, photoId]);
          return res.json({ success: true, selected: false });
        }
        await client.query(
          'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente) VALUES ($1,$2,NULL,NULL) ON CONFLICT DO NOTHING',
          [galleryId, photoId]
        );
      }
    } else {
      // compatibilidade (antes da migração)
      const exists = await client.query('SELECT id FROM king_selections WHERE gallery_id=$1 AND photo_id=$2', [galleryId, photoId]);
      if (exists.rows.length) {
        await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id=$2', [galleryId, photoId]);
        return res.json({ success: true, selected: false });
      }
      await client.query(
        'INSERT INTO king_selections (gallery_id, photo_id, feedback_cliente) VALUES ($1,$2,NULL) ON CONFLICT (gallery_id, photo_id) DO NOTHING',
        [galleryId, photoId]
      );
    }
    res.json({ success: true, selected: true });
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
    const gRes = await client.query('SELECT id, status FROM king_galleries WHERE id=$1', [req.ksClient.galleryId]);
    const galleryId = gRes.rows?.[0]?.id;
    const stGallery = String(gRes.rows?.[0]?.status || '').toLowerCase();
    if (!galleryId) return res.status(404).json({ message: 'Galeria não encontrada.' });

    const cid = req.ksClient.clientId ? parseInt(req.ksClient.clientId, 10) : null;
    let locked = ['revisao', 'finalizado'].includes(stGallery);
    if (cid && (await hasTable(client, 'king_gallery_clients')) && (await hasColumn(client, 'king_gallery_clients', 'status'))) {
      const stRes = await client.query('SELECT status FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2', [cid, galleryId]);
      const st = String(stRes.rows?.[0]?.status || '').toLowerCase();
      if (st) locked = ['revisao', 'finalizado'].includes(st);
    }
    if (locked) {
      return res.status(409).json({ message: 'Sua seleção já foi enviada e está em revisão. Aguarde ou peça reativação ao fotógrafo.' });
    }

    const hasSelClientId = await hasColumn(client, 'king_selections', 'client_id');

    if (String(mode) === 'unselect') {
      if (hasSelClientId) {
        if (cid) {
          if (ids.length) {
            await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2 AND photo_id = ANY($3::int[])', [galleryId, cid, ids]);
          } else {
            await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND client_id=$2', [galleryId, cid]);
          }
        } else {
          if (ids.length) {
            await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL AND photo_id = ANY($2::int[])', [galleryId, ids]);
          } else {
            await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND client_id IS NULL', [galleryId]);
          }
        }
      } else {
        if (ids.length) await client.query('DELETE FROM king_selections WHERE gallery_id=$1 AND photo_id = ANY($2::int[])', [galleryId, ids]);
        else await client.query('DELETE FROM king_selections WHERE gallery_id=$1', [galleryId]);
      }
      return res.json({ success: true });
    }

    // select
    if (!ids.length) return res.json({ success: true });
    // garante que ids pertencem à galeria
    const validRes = await client.query('SELECT id FROM king_photos WHERE gallery_id=$1 AND id = ANY($2::int[])', [galleryId, ids]);
    const validIds = validRes.rows.map(r => r.id);
    if (!validIds.length) return res.json({ success: true });

    if (hasSelClientId) {
      if (cid) {
        const values = validIds.map((pid, idx) => `($1,$2,$${idx + 3},NULL)`).join(',');
        await client.query(
          `INSERT INTO king_selections (gallery_id, client_id, photo_id, feedback_cliente)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          [galleryId, cid, ...validIds]
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
    const cid = req.ksClient.clientId ? parseInt(req.ksClient.clientId, 10) : null;
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
        : await client.query(
          `SELECT p.original_name
           FROM king_selections s
           JOIN king_photos p ON p.id = s.photo_id
           WHERE s.gallery_id=$1 AND s.client_id IS NULL
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
    const gRes = await client.query('SELECT id, status FROM king_galleries WHERE id=$1', [req.ksClient.galleryId]);
    const galleryId = gRes.rows?.[0]?.id;
    const stGallery = String(gRes.rows?.[0]?.status || '').toLowerCase();
    if (!galleryId) return res.status(404).json({ message: 'Galeria não encontrada.' });

    const cid = req.ksClient.clientId ? parseInt(req.ksClient.clientId, 10) : null;
    const hasClientTable = await hasTable(client, 'king_gallery_clients');
    const hasClientStatus = hasClientTable && (await hasColumn(client, 'king_gallery_clients', 'status'));
    const hasClientFeedback = hasClientTable && (await hasColumn(client, 'king_gallery_clients', 'feedback_cliente'));

    // Lock por cliente (multi-client) — fallback para status global (legacy)
    let locked = ['revisao', 'finalizado'].includes(stGallery);
    if (cid && hasClientStatus) {
      const stRes = await client.query('SELECT status FROM king_gallery_clients WHERE id=$1 AND gallery_id=$2', [cid, galleryId]);
      const st = String(stRes.rows?.[0]?.status || '').toLowerCase();
      if (st) locked = ['revisao', 'finalizado'].includes(st);
    }
    if (locked) {
      return res.status(409).json({ message: 'Sua seleção já foi enviada. Aguarde a revisão ou solicite reativação ao fotógrafo.' });
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
    } catch (_) {}

    res.json({ success: true });
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
    const photo = pRes.rows[0];
    const buf = await fetchPhotoFileBufferFromFilePath(photo.file_path);
    if (!buf) return res.status(500).send('Não foi possível carregar a imagem (Cloudflare/R2 não configurado).');

    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 1200;
    const max = 1200;
    const scale = Math.min(max / Math.max(width, height), 1);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const wm = await loadWatermarkForGallery(client, payload.galleryId);
    const out = await buildWatermarkedJpeg({
      imgBuffer: buf,
      outW,
      outH,
      watermark: wm
    });

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    if (String(req.query.download || '') === '1') {
      const hasAllowDownload = await hasColumn(client, 'king_galleries', 'allow_download');
      const gRes = await client.query('SELECT allow_download FROM king_galleries WHERE id=$1', [payload.galleryId]);
      const allowDownload = hasAllowDownload && gRes.rows[0] && gRes.rows[0].allow_download === true;
      if (allowDownload) {
        const fn = (photo.original_name || `foto-${photoId}.jpg`).toString().replace(/[\/\\:*?"<>|]+/g, '-');
        res.set('Content-Disposition', `attachment; filename="${fn.endsWith('.jpg') || fn.endsWith('.jpeg') ? fn : fn + '.jpg'}"`);
      }
    }
    res.send(out);
  } finally {
    client.release();
  }
}));

module.exports = router;

