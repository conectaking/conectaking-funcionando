const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').toString().trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').toString().trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').toString().trim();
  const bucket = (process.env.R2_BUCKET || '').toString().trim();
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
  const publicUrl = cfg.publicBaseUrl ? `${cfg.publicBaseUrl}/${encodeURI(key)}` : null;
  return { uploadUrl, publicUrl };
}

module.exports = {
  getR2Config,
  getR2Client,
  r2GetObjectBuffer,
  r2PresignPut
};

