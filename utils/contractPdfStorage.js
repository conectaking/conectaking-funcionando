/**
 * Storage de PDFs de contratos: R2 (Cloudflare) quando configurado, senão disco local.
 * Usa as mesmas variáveis do upload genérico de PDF: PDF_R2_* ou R2_*.
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

function getPdfR2Config() {
  const accountId = (process.env.PDF_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').toString().trim();
  const accessKeyId = (process.env.PDF_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '').toString().trim();
  const secretAccessKey = (process.env.PDF_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '').toString().trim();
  const bucket = (process.env.PDF_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || '').toString().trim();
  const publicUrlBase = (process.env.PDF_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').toString().trim().replace(/\/$/, '');
  const enabled = !!(accountId && accessKeyId && secretAccessKey && bucket);
  return { enabled, accountId, accessKeyId, secretAccessKey, bucket, publicUrlBase };
}

let _client = null;

function getPdfR2Client() {
  const cfg = getPdfR2Config();
  if (!cfg.enabled) return null;
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: cfg.accountId ? `https://${cfg.accountId}.r2.cloudflarestorage.com` : undefined,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: true
  });
  return _client;
}

/**
 * Faz upload do buffer do PDF para o R2 (bucket de PDFs).
 * @param {Buffer} buffer - Conteúdo do PDF
 * @param {number|string} userId - ID do usuário (para prefixo)
 * @param {string} originalName - Nome original do arquivo (será sanitizado na key)
 * @returns {Promise<{ key: string, publicUrl: string }|null>} key e URL pública, ou null se R2 não configurado/falha
 */
async function uploadContractPdfToR2(buffer, userId, originalName) {
  const cfg = getPdfR2Config();
  const client = getPdfR2Client();
  if (!cfg.enabled || !client) return null;
  const safeName = (originalName || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'documento.pdf';
  const key = `contracts/${userId}/${Date.now()}_${safeName}`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      CacheControl: 'private, max-age=31536000'
    }));
    const publicUrl = cfg.publicUrlBase ? `${cfg.publicUrlBase}/${key}` : null;
    return publicUrl ? { key, publicUrl } : null;
  } catch (err) {
    const logger = require('./logger');
    if (logger && logger.warn) logger.warn('contractPdfStorage: falha ao enviar PDF para R2', { message: err.message });
    return null;
  }
}

module.exports = {
  getPdfR2Config,
  uploadContractPdfToR2
};
