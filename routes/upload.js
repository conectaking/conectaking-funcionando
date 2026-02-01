const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const { protectUser } = require('../middleware/protectUser');
const config = require('../config');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
require('dotenv').config();

const router = express.Router();

// Cloudflare Images /direct_upload tem rate-limit agressivo.
// Se várias pessoas (ou o uploader em paralelo) chamarem /api/upload/auth, isso estoura 429.
// Aqui nós SERIALIZAMOS as chamadas ao Cloudflare e colocamos um intervalo mínimo entre elas.
let _cfAuthQueue = Promise.resolve();
let _cfLastAuthAt = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Configurar multer para upload de imagens em memória
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
});

router.post('/auth', protectUser, asyncHandler(async (req, res) => {
    const accountId =
        process.env.CF_IMAGES_ACCOUNT_ID ||
        process.env.CLOUDFLARE_ACCOUNT_ID ||
        process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID ||
        null;

    const apiToken =
        process.env.CF_IMAGES_API_TOKEN ||
        process.env.CLOUDFLARE_API_TOKEN ||
        (config.cloudflare && config.cloudflare.apiToken) ||
        null;

    const apiKey = process.env.CLOUDFLARE_API_KEY || null;
    const email = process.env.CLOUDFLARE_EMAIL || null;

    const headers = apiToken
        ? { 'Authorization': `Bearer ${String(apiToken).trim()}`, 'Accept': 'application/json' }
        : (apiKey && email)
            ? { 'X-Auth-Email': String(email).trim(), 'X-Auth-Key': String(apiKey).trim(), 'Accept': 'application/json' }
            : null;

    if (!accountId || !headers) {
        logger.error('Credenciais do Cloudflare não encontradas');
        return res.status(500).json({
            success: false,
            message: 'Cloudflare não configurado (CF_IMAGES_ACCOUNT_ID / CF_IMAGES_API_TOKEN ou CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY).'
        });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`;

    async function tryOnce() {
        const response = await fetch(url, { method: 'POST', headers });
        const text = await response.text();
        let data = null;
        try { data = JSON.parse(text); } catch (_) {}
        return { response, data, text };
    }

    async function runThrottled() {
        // Espaçamento entre chamadas ao Cloudflare (ajuda muito no 429 code 971)
        const minGapMs = 5500;
        const since = Date.now() - _cfLastAuthAt;
        if (since < minGapMs) await sleep(minGapMs - since);

        // Backoff simples para rate-limit (429) e instabilidades (5xx)
        const maxAttempts = 5;
        let attempt = 0;
        let waitMs = 800;

        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                // eslint-disable-next-line no-await-in-loop
                const { response, data, text } = await tryOnce();

                if (response.ok && data && data.success && data.result) {
                    _cfLastAuthAt = Date.now();
                    const accountHash =
                        (config.cloudflare && config.cloudflare.accountHash) ||
                        process.env.CLOUDFLARE_ACCOUNT_HASH ||
                        process.env.CF_IMAGES_ACCOUNT_HASH ||
                        null;

                    logger.debug('URL de upload do Cloudflare gerada', {
                        userId: req.user.userId,
                        imageId: data.result.id
                    });

                    return {
                        ok: true,
                        payload: {
                            success: true,
                            uploadURL: data.result.uploadURL,
                            imageId: data.result.id,
                            accountHash
                        }
                    };
                }

                const cfMsg =
                    (data && data.errors && data.errors[0] && data.errors[0].message) ||
                    (data && data.message) ||
                    text ||
                    'Falha ao obter URL de upload.';

                // Rate-limit / instabilidade: retry
                if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
                    const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
                    const sleepMs = retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : waitMs;
                    logger.warn('Cloudflare direct_upload retry', { status: response.status, attempt, sleepMs });
                    // eslint-disable-next-line no-await-in-loop
                    await sleep(sleepMs + Math.round(Math.random() * 250));
                    waitMs = Math.min(waitMs * 2, 8000);
                    continue;
                }

                logger.error('Erro da API Cloudflare', { status: response.status, errors: data?.errors, body: text?.slice(0, 300) });
                return { ok: false, status: response.status || 502, message: cfMsg };
            } catch (error) {
                logger.error('Erro ao autenticar com Cloudflare', error);
                if (attempt < maxAttempts) {
                    // eslint-disable-next-line no-await-in-loop
                    await sleep(waitMs + Math.round(Math.random() * 250));
                    waitMs = Math.min(waitMs * 2, 8000);
                    continue;
                }
                return { ok: false, status: 502, message: `Falha ao falar com Cloudflare: ${error.message || 'erro'}` };
            }
        }

        return { ok: false, status: 502, message: 'Falha ao obter URL de upload.' };
    }

    // Fila global (por instância do Render)
    const p = _cfAuthQueue.then(runThrottled, runThrottled);
    _cfAuthQueue = p.then(() => undefined, () => undefined);
    const out = await p;
    if (out.ok) return res.json(out.payload);
    return res.status(out.status || 502).json({ success: false, message: out.message || 'Falha ao obter URL de upload.' });
}));

/**
 * POST /api/upload/image - Upload direto de imagem (para páginas de personalização)
 * Recebe FormData com campo 'image' e faz upload completo para Cloudflare
 */
router.post('/image', protectUser, upload.single('image'), asyncHandler(async (req, res) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || config.cloudflare.apiToken;

    if (!accountId || !apiToken) {
        logger.error('Credenciais do Cloudflare não encontradas');
        return res.status(500).json({ 
            success: false,
            message: 'Erro de configuração do servidor.' 
        });
    }

    if (!req.file) {
        return res.status(400).json({ 
            success: false,
            message: 'Nenhuma imagem enviada.' 
        });
    }
    
    try {
        // Obter URL de upload do Cloudflare
        const authResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });
        
        const authData = await authResponse.json();
        
        if (!authData.success || !authData.result) {
            throw new Error(authData.errors?.[0]?.message || 'Falha ao obter URL de upload');
        }
        
        const { uploadURL, id: imageId } = authData.result;
        
        // Fazer upload da imagem para Cloudflare usando FormData do Node.js
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'image.jpg',
            contentType: req.file.mimetype
        });
        
        const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            logger.error('Erro no upload para Cloudflare:', errorText);
            throw new Error('Falha ao fazer upload da imagem para Cloudflare');
        }
        
        // Construir URL final da imagem
        const accountHash = config.cloudflare.accountHash || accountId;
        const imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
        
        logger.info('✅ [UPLOAD] Imagem enviada com sucesso', { 
            imageId,
            userId: req.user.userId,
            imageUrl 
        });
        
        res.json({
            success: true,
            url: imageUrl,
            imageUrl: imageUrl
        });
    } catch (error) {
        logger.error('Erro ao fazer upload da imagem:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao fazer upload: ' + error.message 
        });
    }
}));

// Endpoint para obter URL completa da imagem após upload
router.get('/get-url/:imageId', protectUser, asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || config.cloudflare.apiToken;

    if (!accountId || !apiToken) {
        logger.error('Credenciais do Cloudflare não encontradas');
        throw new Error('Erro de configuração do servidor.');
    }

    try {
        // Buscar informações da imagem no Cloudflare
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });

        const data = await response.json();
        
        if (data.success && data.result) {
            // Cloudflare retorna a imagem em variants - usar a primeira variante pública
            let imageUrl = data.result.variants?.[0] || data.result.filename || null;
            
            if (imageUrl) {
                logger.debug('✅ [UPLOAD] URL da imagem obtida do Cloudflare variants', { 
                    imageId, 
                    userId: req.user.userId,
                    imageUrl 
                });
                res.json({
                    success: true,
                    url: imageUrl,
                    imageUrl: imageUrl
                });
            } else {
                // Se não tiver variant, construir URL baseada no account hash
                const accountHash = config.cloudflare.accountHash || accountId;
                // Cloudflare Images usa o formato: https://imagedelivery.net/{account_hash}/{image_id}/{variant_name}
                imageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/public`;
                
                logger.debug('⚠️ [UPLOAD] Construindo URL baseada em accountHash e imageId', { 
                    imageId,
                    accountHash,
                    imageUrl,
                    userId: req.user.userId
                });
                
                res.json({
                    success: true,
                    url: imageUrl,
                    imageUrl: imageUrl
                });
            }
        } else {
            logger.error('❌ [UPLOAD] Erro ao buscar imagem no Cloudflare', { 
                errors: data.errors,
                imageId,
                userId: req.user.userId 
            });
            throw new Error(data.errors[0]?.message || 'Falha ao obter URL da imagem.');
        }
    } catch (error) {
        logger.error('Erro ao obter URL da imagem:', error);
        throw error;
    }
}));

module.exports = router;