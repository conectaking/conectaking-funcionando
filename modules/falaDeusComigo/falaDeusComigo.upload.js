/**
 * Upload de anexos (PDF/Word) para Fala Deus Comigo.
 * Usa o mesmo R2 do pdf-upload quando configurado.
 */
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../../utils/logger');

const pdfAccountId = (process.env.PDF_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').toString().trim();
const pdfAccessKeyId = (process.env.PDF_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '').toString().trim();
const pdfSecretAccessKey = (process.env.PDF_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '').toString().trim();
const pdfBucket = (process.env.PDF_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || '').toString().trim();
const pdfPublicUrlBase = (process.env.PDF_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '').toString().trim().replace(/\/$/, '');

function isR2Configured() {
    return !!(pdfAccountId && pdfAccessKeyId && pdfSecretAccessKey && pdfBucket && pdfPublicUrlBase);
}

let _s3Client = null;
function getS3Client() {
    if (!isR2Configured()) return null;
    if (_s3Client) return _s3Client;
    _s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${pdfAccountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: pdfAccessKeyId,
            secretAccessKey: pdfSecretAccessKey
        },
        forcePathStyle: true
    });
    return _s3Client;
}

/**
 * Faz upload do buffer para R2 e retorna a URL pública.
 * @param {Buffer} buffer
 * @param {string} userId
 * @param {number} itemId
 * @param {string} originalName
 * @param {string} mimetype
 * @returns {Promise<string>} attachment_url
 */
async function uploadAttachment(buffer, userId, itemId, originalName, mimetype) {
    if (!isR2Configured()) {
        throw new Error('Upload de anexos não está configurado (R2). Use o campo URL do anexo para colar um link.');
    }
    const ext = path.extname(originalName || '').toLowerCase() || (mimetype && mimetype.includes('pdf') ? '.pdf' : '.bin');
    const safeExt = ['.pdf', '.doc', '.docx'].includes(ext) ? ext : '.pdf';
    const key = `fala-deus-comigo/${userId}/${itemId}/${Date.now()}${safeExt}`;
    const client = getS3Client();
    await client.send(new PutObjectCommand({
        Bucket: pdfBucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype || (safeExt === '.pdf' ? 'application/pdf' : 'application/octet-stream')
    }));
    const attachmentUrl = `${pdfPublicUrlBase}/${key}`;
    logger.info('falaDeusComigo upload:', { key, userId, itemId });
    return attachmentUrl;
}

module.exports = {
    isR2Configured,
    uploadAttachment
};
