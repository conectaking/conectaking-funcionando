const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fetch = require('node-fetch');

function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').toString().trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').toString().trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').toString().trim();
  const bucket = (process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || '').toString().trim();
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').toString().trim().replace(/\/$/, '');
  const enabled = !!(accountId && accessKeyId && secretAccessKey && bucket);
  return {
    enabled,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl
  };
}

let _client = null;
function getR2Client() {
  const cfg = getR2Config();
  if (!cfg.enabled) return null;
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey
    },
    // Preferir path-style (usa apenas <accountId>.r2.cloudflarestorage.com),
    // porque algumas redes/ambientes bloqueiam/bugam o wildcard TLS do host-style.
    // Ex.: https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key>
    forcePathStyle: true
  });
  return _client;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function r2GetObjectBuffer(key) {
  const cfg = getR2Config();
  const client = getR2Client();
  if (!cfg.enabled || !client) return null;
  const out = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  if (!out || !out.Body) return null;
  return await streamToBuffer(out.Body);
}

/**
 * Gera URL pública: R2_PUBLIC_BASE_URL + / + objectKey
 * Para chaves bible-tts/* usa R2_PUBLIC_URL (URL direta do bucket) se existir, pois o domínio customizado pode não servir esse path.
 * Base sem / final, key sem / inicial, encoding por segmento (espaço, acento).
 */
function r2PublicUrl(objectKey) {
  const cfg = getR2Config();
  const k = String(objectKey || '').replace(/^\/+/, '').trim();
  if (!k) return null;
  const segments = k.split('/').filter(Boolean).map(s => encodeURIComponent(s));
  const pathPart = segments.join('/');
  // TTS da Bíblia: preferir URL direta do R2 (pub-xxx.r2.dev) se o domínio customizado não servir bible-tts
  const directUrl = (process.env.R2_PUBLIC_URL || '').toString().trim().replace(/\/+$/, '');
  if (k.startsWith('bible-tts/') && directUrl) return `${directUrl}/${pathPart}`;
  if (!cfg.publicBaseUrl) return null;
  const base = cfg.publicBaseUrl.replace(/\/+$/, '');
  return `${base}/${pathPart}`;
}

/**
 * Obtém o objeto do R2 via URL pública (evita SSL handshake do Render).
 * Requer R2_PUBLIC_BASE_URL = https://r2.conectaking.com.br
 */
async function r2GetObjectViaPublicUrl(key) {
  const url = r2PublicUrl(key);
  if (!url) return null;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'image/*' } });
    if (!res.ok) return null;
    const buf = await res.buffer();
    return buf && buf.length ? buf : null;
  } catch (_) {
    return null;
  }
}

async function r2PresignPut({ key, contentType, cacheControl, expiresInSeconds = 600 }) {
  const cfg = getR2Config();
  const client = getR2Client();
  if (!cfg.enabled || !client) throw new Error('R2 não configurado');
  const cmd = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
    CacheControl: cacheControl || 'public, max-age=31536000, immutable'
  });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: Math.max(60, Math.min(3600, expiresInSeconds)) });
  const publicUrl = r2PublicUrl(key);
  return { uploadUrl, publicUrl: publicUrl || undefined };
}

async function r2PutObjectBuffer({ key, body, contentType, cacheControl }) {
  const cfg = getR2Config();
  const client = getR2Client();
  if (!cfg.enabled || !client) throw new Error('R2 não configurado');
  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    CacheControl: cacheControl || 'public, max-age=31536000, immutable'
  }));
  const publicUrl = r2PublicUrl(key);
  return { key, publicUrl: publicUrl || undefined };
}

/** Testa a conexão com o R2 (diagnóstico de 502). */
async function r2Diagnostic() {
  const cfg = getR2Config();
  const result = {
    ok: false,
    enabled: cfg.enabled,
    hasAccountId: !!cfg.accountId,
    hasBucket: !!cfg.bucket,
    hasCredentials: !!(cfg.accessKeyId && cfg.secretAccessKey),
    endpoint: cfg.enabled ? `https://${cfg.accountId}.r2.cloudflarestorage.com` : null,
    error: null,
    objectCount: null,
    durationMs: null
  };
  if (!cfg.enabled) {
    result.error = 'R2 não configurado (variáveis de ambiente faltando)';
    return result;
  }
  const start = Date.now();
  try {
    const client = getR2Client();
    const cmd = new ListObjectsV2Command({ Bucket: cfg.bucket, MaxKeys: 10 });
    const response = await client.send(cmd);
    result.ok = true;
    result.objectCount = response.Contents?.length ?? 0;
    result.durationMs = Date.now() - start;
  } catch (err) {
    result.error = err?.name ? `${err.name}: ${err.message}` : String(err?.message || err);
    result.durationMs = Date.now() - start;
    if (err?.code) result.code = err.code;
  }
  return result;
}

module.exports = {
  getR2Config,
  getR2Client,
  r2PublicUrl,
  r2GetObjectBuffer,
  r2GetObjectViaPublicUrl,
  r2PresignPut,
  r2PutObjectBuffer,
  r2Diagnostic
};

