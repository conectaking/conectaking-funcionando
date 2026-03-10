const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { protectUser } = require('../middleware/protectUser');
const config = require('../config');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadImageToR2 } = require('../utils/r2');
require('dotenv').config();

const router = express.Router();

// CORS explícito para upload: evita "Failed to fetch" quando o front está em 127.0.0.1:5500 ou outro origin.
// Se o dashboard chamar a API noutro domínio que redireciona, o redirect pode não ter CORS; aqui garantimos.
const UPLOAD_CORS_ORIGINS = new Set([
    'http://127.0.0.1:5500', 'http://127.0.0.1:5000', 'http://127.0.0.1:3000',
    'http://localhost:5500', 'http://localhost:5000', 'http://localhost:3000', 'http://localhost',
    'https://conectaking.com.br', 'https://www.conectaking.com.br', 'https://tag.conectaking.com.br',
    ...(process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
]);
router.use((req, res, next) => {
    const origin = req.get('Origin');
    const allow = origin && (UPLOAD_CORS_ORIGINS.has(origin) || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin));
    if (allow) {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Credentials', 'true');
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
});

// Cloudflare Images /direct_upload tem rate-limit agressivo.
// Se várias pessoas (ou o uploader em paralelo) chamarem /api/upload/auth, isso estoura 429.
// Aqui nós SERIALIZAMOS as chamadas ao Cloudflare e colocamos um intervalo mínimo entre elas.
let _cfAuthQueue = Promise.resolve();
let _cfLastAuthAt = 0;
let _cfCooldownUntil = 0;
// Gap dinâmico (em vez de fixo 5.5s). Começa mais conservador para evitar 429 no banner/upload único.
let _cfMinGapMs = 900;
const _cfMinGapFloorMs = 200;
const _cfMinGapCeilMs = 8000;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Retorna { accountId, headers } para Cloudflare Images ou null se não configurado. */
function getCloudflareCreds() {
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
    if (!accountId || !headers) return null;
    return { accountId, headers };
}

// Limite máximo por arquivo (15 MB) — exibir mensagem amigável no cliente quando exceder
const UPLOAD_MAX_MB = 15;
const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: UPLOAD_MAX_BYTES },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'), false);
        }
    }
});

// /api/upload/auth é chamado muitas vezes no upload em massa.
// Limitamos por USUÁRIO autenticado (não por IP) e com teto alto.
const skipOptions = (req) => req.method === 'OPTIONS';
const uploadAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5000, // 1000+ fotos sem travar
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    // express-rate-limit v8 exige ipKeyGenerator para IPv6 (evita bypass de rate limit)
    keyGenerator: (req, res) => (req.user && req.user.userId)
        ? `u:${req.user.userId}`
        : (typeof rateLimit.ipKeyGenerator === 'function' ? rateLimit.ipKeyGenerator(req, res) : 'ip'),
    handler: (req, res) => {
        logger.warn('Rate limit /api/upload/auth excedido', {
            ip: req.ip,
            userId: req.user?.userId,
            path: req.path,
            method: req.method
        });
        const retryAfter = 60;
        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
            success: false,
            message: 'Falha ao obter autorização para upload. Muitas tentativas; aguarde 1 minuto e clique em Trocar imagem novamente.',
            retry_after_seconds: retryAfter
        });
    }
});

/** Obtém URL de upload do Cloudflare (com fila e retry). Usado por /auth e /image. */
async function runThrottledAuth(accountId, headers) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`;
    async function tryOnce() {
        const response = await fetch(url, { method: 'POST', headers });
        const text = await response.text();
        let data = null;
        try { data = JSON.parse(text); } catch (_) {}
        return { response, data, text };
    }

    if (_cfCooldownUntil && Date.now() < _cfCooldownUntil) {
        const secs = Math.max(1, Math.ceil((_cfCooldownUntil - Date.now()) / 1000));
        return { ok: false, status: 429, message: `Falha ao obter autorização para upload. Aguarde ${secs}s e tente novamente (Trocar imagem).`, retry_after_seconds: secs };
    }

    const minGapMs = Math.max(_cfMinGapFloorMs, Math.min(_cfMinGapCeilMs, _cfMinGapMs || 0));
    const since = Date.now() - _cfLastAuthAt;
    if (since < minGapMs) await sleep(minGapMs - since);

    const maxAttempts = 6;
    let attempt = 0;
    let waitMs = 1200;

    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            const { response, data, text } = await tryOnce();

            if (response.ok && data && data.success && data.result) {
                _cfLastAuthAt = Date.now();
                _cfMinGapMs = Math.max(_cfMinGapFloorMs, Math.round((_cfMinGapMs || minGapMs) * 0.92));
                const accountHash =
                    (config.cloudflare && config.cloudflare.accountHash) ||
                    process.env.CLOUDFLARE_ACCOUNT_HASH ||
                    process.env.CF_IMAGES_ACCOUNT_HASH ||
                    null;
                logger.debug('URL de upload do Cloudflare gerada', { imageId: data.result.id });
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

            if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
                const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10);
                if (response.status === 429) {
                    _cfMinGapMs = Math.min(_cfMinGapCeilMs, Math.round((_cfMinGapMs || minGapMs) * 1.6 + 120));
                    _cfCooldownUntil = Date.now() + Math.min(18000, Math.max(3500, _cfMinGapMs * 2));
                }
                const sleepMs = retryAfter > 0
                    ? Math.min(retryAfter * 1000, 20000)
                    : Math.min(Math.max(waitMs, 2500), 20000);
                logger.warn('Cloudflare direct_upload retry', { status: response.status, attempt, sleepMs });
                await sleep(sleepMs + Math.round(Math.random() * 500));
                waitMs = Math.min(waitMs * 2, 20000);
                continue;
            }

            logger.error('Erro da API Cloudflare', { status: response.status, errors: data?.errors, body: text?.slice(0, 300) });
            if (response.status === 429) {
                _cfMinGapMs = Math.min(_cfMinGapCeilMs, Math.round((_cfMinGapMs || minGapMs) * 1.8 + 200));
                const secs = Math.max(5, Math.min(25, Math.ceil((_cfMinGapMs * 2) / 1000)));
                _cfCooldownUntil = Date.now() + secs * 1000;
                return { ok: false, status: 429, message: `Falha ao obter autorização para upload. Aguarde ${secs}s e clique em Trocar imagem novamente.`, retry_after_seconds: secs };
            }
            return { ok: false, status: response.status || 502, message: cfMsg };
        } catch (error) {
            logger.error('Erro ao autenticar com Cloudflare', error);
            if (attempt < maxAttempts) {
                await sleep(waitMs + Math.round(Math.random() * 500));
                waitMs = Math.min(waitMs * 2, 20000);
                continue;
            }
            return { ok: false, status: 502, message: `Falha ao falar com Cloudflare: ${error.message || 'erro'}` };
        }
    }
    return { ok: false, status: 502, message: 'Falha ao obter URL de upload.' };
}

/** Enfileira pedido de auth e devolve o resultado (para /auth e /image). */
async function enqueueThrottledAuth(accountId, headers) {
    const p = _cfAuthQueue.then(() => runThrottledAuth(accountId, headers), () => runThrottledAuth(accountId, headers));
    _cfAuthQueue = p.then(() => undefined, () => undefined);
    return p;
}

/** Base URL da API (para devolver uploadURL quando usamos R2 em /auth). Usar sempre a URL pública da API (Render) para evitar CORS quando o dashboard está em 127.0.0.1:5500 ou em conectaking.com.br. */
function getApiBaseUrl(req) {
    // Preferir explicitamente a URL da API (Render); nunca devolver FRONTEND_URL (conectaking.com.br) para uploadURL, senão o browser bloqueia por CORS.
    const apiUrl = (process.env.API_URL || process.env.API_PUBLIC_URL || 'https://conectaking-api.onrender.com').toString().trim().replace(/\/$/, '');
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) return apiUrl;
    const proto = (req && req.get && req.get('x-forwarded-proto')) || (req && req.protocol) || 'https';
    const host = (req && req.get && req.get('x-forwarded-host')) || (req && req.get && req.get('host')) || null;
    if (host && /\.onrender\.com$/.test(host)) {
        const base = `${proto}://${host}`;
        return base.replace(/^http:\/\//, 'https://');
    }
    return apiUrl || '';
}

router.post('/auth', protectUser, uploadAuthLimiter, asyncHandler(async (req, res) => {
    const { getR2Config } = require('../utils/r2');
    const r2Cfg = getR2Config();
    if (r2Cfg.enabled && r2Cfg.publicBaseUrl) {
        const base = getApiBaseUrl(req);
        if (base) {
            const uploadURL = `${base}/api/upload/receive-one`;
            logger.debug('[/auth] R2 ativo: devolvendo uploadURL para receive-one');
            return res.json({
                success: true,
                uploadURL,
                imageId: 'r2',
                accountHash: 'r2',
                useResponseUrl: true
            });
        }
    }

    const creds = getCloudflareCreds();
    if (!creds) {
        logger.error('Credenciais do Cloudflare não encontradas');
        return res.status(500).json({
            success: false,
            message: 'Cloudflare não configurado. Configure R2 (R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_BASE_URL) ou Cloudflare Images.'
        });
    }
    const out = await enqueueThrottledAuth(creds.accountId, creds.headers);
    if (out.ok) return res.json(out.payload);
    const status = out.status || 502;
    const retrySec = out.retry_after_seconds || (status === 429 ? 60 : undefined);
    if (retrySec) res.set('Retry-After', String(retrySec));
    return res.status(status).json({
        success: false,
        message: out.message || 'Falha ao obter autorização para upload. Aguarde e tente novamente.',
        retry_after_seconds: retrySec
    });
}));

/**
 * POST /api/upload/receive-one - Recebe um ficheiro (fluxo /auth com R2).
 * Quando /auth devolve uploadURL = este endpoint, o cliente envia o ficheiro aqui; subimos para R2 e devolvemos a URL.
 * Resposta: { success: true, url, imageUrl }. O cliente deve usar url/imageUrl como URL final da imagem.
 */
const receiveOneFields = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]);
router.post('/receive-one', protectUser, receiveOneFields, asyncHandler(async (req, res) => {
    const file = (req.files && req.files.file && req.files.file[0]) || (req.files && req.files.image && req.files.image[0]) || req.file;
    if (!file || !file.buffer) {
        return res.status(400).json({
            success: false,
            message: 'Nenhuma imagem enviada. Envie o ficheiro no campo "file" ou "image".'
        });
    }
    const r2Url = await uploadImageToR2(file.buffer, file.mimetype, file.originalname || 'image.jpg');
    if (r2Url) {
        logger.info('✅ [UPLOAD] Imagem receive-one enviada via R2', { userId: req.user.userId });
        return res.json({ success: true, url: r2Url, imageUrl: r2Url });
    }
    return res.status(503).json({
        success: false,
        message: 'Upload temporariamente indisponível. Tente novamente em instantes.'
    });
}));

/**
 * POST /api/upload/image - Upload direto de imagem (banner, personalização, etc.)
 * Preferência: R2 (mais rápido). Fallback: Cloudflare Images (fila de auth).
 */
router.post('/image', protectUser, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Nenhuma imagem enviada.'
        });
    }

    const r2Url = await uploadImageToR2(req.file.buffer, req.file.mimetype, req.file.originalname || 'image.jpg');
    if (r2Url) {
        logger.info('✅ [UPLOAD] Imagem enviada via R2', { userId: req.user.userId });
        return res.json({ success: true, url: r2Url, imageUrl: r2Url });
    }

    const creds = getCloudflareCreds();
    if (!creds) {
        logger.error('Credenciais do Cloudflare não encontradas');
        return res.status(500).json({
            success: false,
            message: 'Configure R2 (R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_BASE_URL) ou Cloudflare Images para upload de imagens.'
        });
    }

    const out = await enqueueThrottledAuth(creds.accountId, creds.headers);
    if (!out.ok) {
        const status = out.status || 502;
        const retrySec = out.retry_after_seconds || (status === 429 ? 60 : undefined);
        if (retrySec) res.set('Retry-After', String(retrySec));
        return res.status(status).json({
            success: false,
            message: out.message || 'Falha ao obter autorização para upload. Aguarde e tente novamente.',
            retry_after_seconds: retrySec
        });
    }

    const { uploadURL, imageId, accountHash, useResponseUrl } = out.payload;

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype
    });

    const uploadHeaders = { ...formData.getHeaders() };
    if (uploadURL.indexOf('receive-one') !== -1 && req.headers.authorization) {
        uploadHeaders.Authorization = req.headers.authorization;
    }
    const uploadResponse = await fetch(uploadURL, {
        method: 'POST',
        body: formData,
        headers: uploadHeaders
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error('Erro no upload para Cloudflare:', errorText);
        return res.status(502).json({
            success: false,
            message: 'Falha ao enviar a imagem. Tente novamente em alguns segundos.'
        });
    }

    let imageUrl;
    if (useResponseUrl || accountHash === 'r2') {
        const data = await uploadResponse.json().catch(() => ({}));
        imageUrl = data.url || data.imageUrl || null;
        if (!imageUrl) {
            logger.error('Resposta receive-one sem url/imageUrl', data);
            return res.status(502).json({
                success: false,
                message: 'Resposta do servidor de upload inválida. Tente novamente.'
            });
        }
    } else {
        const hash = accountHash || creds.accountId;
        imageUrl = `https://imagedelivery.net/${hash}/${imageId}/public`;
    }

    logger.info('✅ [UPLOAD] Imagem enviada com sucesso', { imageId, userId: req.user.userId, imageUrl });

    res.json({
        success: true,
        url: imageUrl,
        imageUrl: imageUrl
    });
}));

/**
 * POST /api/upload/images - Upload de múltiplas imagens (carrossel, etc.)
 * Preferência: R2 (mais rápido, sem fila). Fallback: Cloudflare Images por ficheiro.
 */
const maxCarouselImages = 20;
router.post('/images', protectUser, upload.array('images', maxCarouselImages), asyncHandler(async (req, res) => {
    const files = req.files && Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Nenhuma imagem enviada. Use o campo "images" com um ou mais ficheiros.'
        });
    }

    const creds = getCloudflareCreds();
    const urls = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let url = await uploadImageToR2(file.buffer, file.mimetype, file.originalname || `image-${i + 1}.jpg`);
        if (url) {
            urls.push(url);
            continue;
        }
        if (!creds) {
            return res.status(500).json({
                success: false,
                message: 'Configure R2 ou Cloudflare Images para upload. Falha na imagem ' + (i + 1),
                uploaded_so_far: urls
            });
        }
        const out = await enqueueThrottledAuth(creds.accountId, creds.headers);
        if (!out.ok) {
            const status = out.status || 502;
            const retrySec = out.retry_after_seconds || (status === 429 ? 60 : undefined);
            if (retrySec) res.set('Retry-After', String(retrySec));
            return res.status(status).json({
                success: false,
                message: out.message || `Falha na imagem ${i + 1}/${files.length}. Aguarde e tente novamente.`,
                retry_after_seconds: retrySec,
                uploaded_so_far: urls
            });
        }
        const { uploadURL, imageId, accountHash, useResponseUrl } = out.payload;
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname || `image-${i + 1}.jpg`,
            contentType: file.mimetype
        });
        const uploadHeaders = { ...formData.getHeaders() };
        if (uploadURL.indexOf('receive-one') !== -1 && req.headers.authorization) {
            uploadHeaders.Authorization = req.headers.authorization;
        }
        const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
            headers: uploadHeaders
        });
        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            logger.error('Erro no upload para Cloudflare (múltiplas)', { index: i, body: errText?.slice(0, 200) });
            return res.status(502).json({
                success: false,
                message: `Falha ao enviar a imagem ${i + 1}. Tente novamente.`,
                uploaded_so_far: urls
            });
        }
        if (useResponseUrl || accountHash === 'r2') {
            const data = await uploadResponse.json().catch(() => ({}));
            const u = data.url || data.imageUrl;
            if (u) urls.push(u);
            else {
                logger.error('Resposta receive-one sem url/imageUrl (múltiplas)', data);
                return res.status(502).json({
                    success: false,
                    message: `Resposta inválida na imagem ${i + 1}. Tente novamente.`,
                    uploaded_so_far: urls
                });
            }
        } else {
            const hash = accountHash || creds.accountId;
            urls.push(`https://imagedelivery.net/${hash}/${imageId}/public`);
        }
    }

    logger.info('✅ [UPLOAD] Múltiplas imagens enviadas', { count: urls.length, userId: req.user.userId });
    res.json({ success: true, urls, imageUrl: urls[0] });
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