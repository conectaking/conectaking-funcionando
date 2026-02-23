const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('../config');
const logger = require('./logger');

/**
 * Envia um buffer de imagem para Cloudflare Images e retorna a URL pública.
 * @param {Buffer} buffer - Conteúdo da imagem
 * @param {string} mimetype - Ex: image/jpeg
 * @param {string} [filename='image.jpg'] - Nome do arquivo
 * @returns {Promise<string>} URL pública da imagem (imagedelivery.net)
 */
async function uploadImageBuffer(buffer, mimetype, filename = 'image.jpg') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ||
        process.env.CF_IMAGES_ACCOUNT_ID ||
        (config.cloudflare && config.cloudflare.accountId) ||
        null;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN ||
        process.env.CF_IMAGES_API_TOKEN ||
        (config.cloudflare && config.cloudflare.apiToken) ||
        null;

    if (!accountId || !apiToken) {
        const err = new Error('Cloudflare não configurado (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN).');
        logger.error('cloudflare-image-upload:', err.message);
        throw err;
    }

    const authResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiToken}`, 'Accept': 'application/json' }
        }
    );
    const authData = await authResponse.json();
    if (!authData.success || !authData.result) {
        const msg = authData.errors?.[0]?.message || 'Falha ao obter URL de upload';
        throw new Error(msg);
    }

    const { uploadURL, id: imageId } = authData.result;
    const formData = new FormData();
    formData.append('file', buffer, {
        filename: filename || 'image.jpg',
        contentType: mimetype || 'image/jpeg'
    });

    const uploadResponse = await fetch(uploadURL, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
    });
    if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        logger.error('Cloudflare upload falhou', { status: uploadResponse.status, body: text.slice(0, 200) });
        throw new Error('Falha ao fazer upload da imagem para Cloudflare');
    }

    const accountHash = (config.cloudflare && config.cloudflare.accountHash) ||
        process.env.CLOUDFLARE_ACCOUNT_HASH ||
        process.env.CF_IMAGES_ACCOUNT_HASH ||
        accountId;
    return `https://imagedelivery.net/${accountHash}/${imageId}/public`;
}

module.exports = { uploadImageBuffer };
