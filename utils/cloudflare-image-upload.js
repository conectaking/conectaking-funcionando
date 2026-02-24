const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('../config');
const logger = require('./logger');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isThrottleError(status, body) {
    if (status === 503 || status === 429) return true;
    const s = (body || '').toString().toLowerCase();
    return /throttl|rate limit|too many requests/i.test(s);
}

/**
 * Envia um buffer de imagem para Cloudflare Images e retorna a URL pública.
 * Em caso de 503/throttling, repete até 3 vezes com espera (2s, 4s).
 */
async function uploadImageBuffer(buffer, mimetype, filename = 'image.jpg') {
    const accountId = process.env.CF_IMAGES_ACCOUNT_ID ||
        process.env.CLOUDFLARE_ACCOUNT_ID ||
        process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID ||
        (config.cloudflare && config.cloudflare.accountId) ||
        null;
    const apiToken = process.env.CF_IMAGES_API_TOKEN ||
        process.env.CLOUDFLARE_API_TOKEN ||
        (config.cloudflare && config.cloudflare.apiToken) ||
        null;

    if (!accountId || !apiToken) {
        const err = new Error('Cloudflare não configurado (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN).');
        logger.error('cloudflare-image-upload:', err.message);
        throw err;
    }

    const maxRetries = 3;
    const delays = [0, 2000, 4000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) await sleep(delays[attempt]);

        const authResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${String(apiToken).trim()}`, 'Accept': 'application/json' }
            }
        );
        const authBody = await authResponse.text();
        const authData = (() => { try { return JSON.parse(authBody); } catch (_) { return {}; } })();
        if (!authData.success || !authData.result) {
            const msg = authData.errors?.[0]?.message || authData.message || 'Falha ao obter URL de upload';
            const authThrottle = authResponse.status === 503 || authResponse.status === 429 || isThrottleError(authResponse.status, authBody);
            if (authThrottle && attempt < maxRetries - 1) {
                logger.warn('Cloudflare throttling (direct_upload), retry em ' + (delays[attempt + 1] / 1000) + 's');
                continue;
            }
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
        const uploadBody = await uploadResponse.text();
        if (!uploadResponse.ok) {
            const throttle = isThrottleError(uploadResponse.status, uploadBody);
            let msg = 'Falha ao fazer upload da imagem para Cloudflare';
            try {
                const j = JSON.parse(uploadBody);
                msg = j.message || j.errors?.[0]?.message || msg;
            } catch (_) {}
            logger.error('Cloudflare upload falhou', { status: uploadResponse.status, throttle, attempt: attempt + 1 });
            if (throttle && attempt < maxRetries - 1) continue;
            throw new Error(msg);
        }

        const accountHash = (config.cloudflare && config.cloudflare.accountHash) ||
            process.env.CLOUDFLARE_ACCOUNT_HASH ||
            process.env.CF_IMAGES_ACCOUNT_HASH ||
            accountId;
        return `https://imagedelivery.net/${accountHash}/${imageId}/public`;
    }

    throw new Error('Serviço de imagens temporariamente ocupado. Aguarde uns segundos e tente de novo.');
}

module.exports = { uploadImageBuffer };
