/**
 * Proxy Node → Laravel (cartão virtual).
 *
 * - /l/* sempre (se LARAVEL_CARD_ENABLED)
 * - /:slug só com flag LARAVEL_CARD_PUBLIC ou ?laravel=1
 * - Canário: LARAVEL_CARD_SLUGS=slug1,slug2 (vazio = todos quando PUBLIC=true)
 */
const http = require('http');

const LARAVEL_ENABLED = String(process.env.LARAVEL_CARD_ENABLED || 'true').toLowerCase() !== 'false';
const LARAVEL_HOST = process.env.LARAVEL_HOST || '127.0.0.1';
const LARAVEL_PORT = Number(process.env.LARAVEL_PORT || 8080);
const LARAVEL_CARD_PUBLIC = String(process.env.LARAVEL_CARD_PUBLIC || 'false').toLowerCase() === 'true';
const LARAVEL_CARD_SLUGS = new Set(
    String(process.env.LARAVEL_CARD_SLUGS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
);

function shouldServePublicCardWithLaravel(req, slug) {
    if (!LARAVEL_ENABLED) return false;
    const q = req.query || {};
    const force = String(q.laravel || q.engine || '').toLowerCase();
    if (force === '1' || force === 'true' || force === 'laravel') return true;
    if (!LARAVEL_CARD_PUBLIC) return false;
    const s = String(slug || '').toLowerCase();
    if (!s) return false;
    if (LARAVEL_CARD_SLUGS.size === 0) return true;
    return LARAVEL_CARD_SLUGS.has(s);
}

function buildForwardHeaders(req, { publicMode } = {}) {
    const fwdProto = (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).toString().split(',')[0].trim();
    const fwdHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
    const headers = { ...req.headers };
    if (fwdHost) {
        headers['x-forwarded-host'] = fwdHost;
        headers.host = fwdHost;
    }
    headers['x-forwarded-proto'] = fwdProto;
    if (publicMode) headers['x-conecta-card-public'] = '1';
    delete headers['content-length'];
    return headers;
}

function proxyToLaravel(req, res, targetPath, { publicMode = false } = {}) {
    if (!LARAVEL_ENABLED) {
        if (!res.headersSent) {
            res.status(503).json({ error: 'Laravel desabilitado (LARAVEL_CARD_ENABLED=false)' });
        }
        return;
    }

    const headers = buildForwardHeaders(req, { publicMode });
    const opts = {
        hostname: LARAVEL_HOST,
        port: LARAVEL_PORT,
        path: targetPath,
        method: req.method,
        headers,
        timeout: 20000
    };

    const proxyReq = http.request(opts, (proxyRes) => {
        const outHeaders = {
            ...proxyRes.headers,
            'x-conecta-proxy': 'laravel',
            'x-conecta-engine': 'laravel'
        };
        if (publicMode) outHeaders['x-conecta-card-public'] = '1';
        res.writeHead(proxyRes.statusCode || 502, outHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[laravel-proxy]', err.message);
        if (!res.headersSent) {
            // Fallback: deixa o Node continuar se for cartão público (quem chama decide)
            res.status(502).send(
                '<h1>Cartão temporariamente indisponível</h1><p>Motor Laravel offline. Tente novamente.</p>'
            );
        }
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            res.status(504).send('<h1>Timeout</h1><p>Laravel demorou demais.</p>');
        }
    });

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
}

function laravelProxyMiddleware(req, res, next) {
    if (!LARAVEL_ENABLED) return next();
    const url = req.originalUrl || req.url || '';
    if (!url.startsWith('/l/') && url !== '/l') return next();
    return proxyToLaravel(req, res, url, { publicMode: false });
}

/**
 * Proxy do cartão público /:slug → /l/card/:slug (modo público, sem banner de prévia).
 */
function proxyPublicCardToLaravel(req, res, slug) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    // Remove flags de debug da query enviada ao Laravel (opcional manter)
    const targetPath = `/l/card/${encodeURIComponent(slug)}${qs}`;
    return proxyToLaravel(req, res, targetPath, { publicMode: true });
}

module.exports = {
    laravelProxyMiddleware,
    proxyPublicCardToLaravel,
    shouldServePublicCardWithLaravel,
    LARAVEL_ENABLED,
    LARAVEL_CARD_PUBLIC,
    LARAVEL_CARD_SLUGS,
    LARAVEL_HOST,
    LARAVEL_PORT
};
