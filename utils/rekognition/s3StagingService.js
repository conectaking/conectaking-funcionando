/**
 * S3 Staging: ponte temporária R2 → Rekognition.
 * Usa bucket AWS S3 (kingselection-rekog-staging) em us-east-1.
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

function getStagingConfig() {
  const region = (process.env.AWS_REGION || 'us-east-1').toString().trim();
  const bucket = (process.env.S3_STAGING_BUCKET || '').toString().trim();
  const prefix = (process.env.S3_STAGING_PREFIX || 'staging/').toString().trim().replace(/\/+$/, '') + '/';
  const enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucket);
  return { enabled, region, bucket, prefix };
}

let _s3Client = null;
function getStagingS3Client() {
  const cfg = getStagingConfig();
  if (!cfg.enabled) return null;
  if (_s3Client) return _s3Client;
  _s3Client = new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  return _s3Client;
}

/**
 * Gera chave temporária no staging. Ex: staging/123/abc123.jpg
 * @param {string} eventIdOrGalleryId - id do evento/galeria
 * @param {string} r2Key - chave original no R2 (opcional)
 * @param {string} variant - ex: 'enroll', 'match', 'face-0'
 */
function buildStagingKey(eventIdOrGalleryId, r2Key, variant = '') {
  const cfg = getStagingConfig();
  const hash = crypto.createHash('md5').update(String(r2Key || Date.now() + Math.random())).digest('hex').slice(0, 12);
  const ext = (r2Key && /\.(jpg|jpeg|png|webp)$/i.test(r2Key)) ? r2Key.replace(/.*\./i, '') : 'jpg';
  const name = variant ? `${hash}-${variant}.${ext}` : `${hash}.${ext}`;
  return `${cfg.prefix}${eventIdOrGalleryId}/${name}`.replace(/\/+/g, '/');
}

/**
 * Envia buffer para o S3 staging.
 * @returns {Promise<string>} key no S3
 */
async function putStagingObject(key, buffer, contentType = 'image/jpeg') {
  const cfg = getStagingConfig();
  const client = getStagingS3Client();
  if (!cfg.enabled || !client) throw new Error('S3 staging não configurado');
  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType
  }));
  return key;
}

/**
 * Remove objeto do staging.
 */
async function deleteStagingObject(key) {
  const cfg = getStagingConfig();
  const client = getStagingS3Client();
  if (!cfg.enabled || !client) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
  } catch (_) {
    // ignore
  }
}

module.exports = {
  getStagingConfig,
  buildStagingKey,
  putStagingObject,
  deleteStagingObject
};
