/**
 * Proxy seguro Node → Laravel (só prefixo /l).
 * Não altera rotas existentes do cartão /:slug.
 */
const http = require('http');

const LARAVEL_ENABLED = String(process.env.LARAVEL_CARD_ENABLED || 'true').toLowerCase() !== 'false';
const LARAVEL_HOST = process.env.LARAVEL_HOST || '127.0.0.1';
const LARAVEL_PORT = Number(process.env.LARAVEL_PORT || 8080);

function laravelProxyMiddleware(req, res, next) {
    if (!LARAVEL_ENABLED) return next();
    const url = req.originalUrl || req.url || '';
    if (!url.startsWith('/l/') && url !== '/l') return next();

    const fwdProto = (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).toString().split(',')[0].trim();
    const fwdHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();

    const headers = { ...req.headers };
    if (fwdHost) headers['x-forwarded-host'] = fwdHost;
    headers['x-forwarded-proto'] = fwdProto;
    // Mantém Host original para o Laravel montar URLs públicas corretas
    if (fwdHost) headers.host = fwdHost;
    delete headers['content-length'];

    const opts = {
        hostname: LARAVEL_HOST,
        port: LARAVEL_PORT,
        path: url,
        method: req.method,
        headers,
        timeout: 15000
    };

    const proxyReq = http.request(opts, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, {
            ...proxyRes.headers,
            'x-conecta-proxy': 'laravel'
        });
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[laravel-proxy]', err.message);
        if (!res.headersSent) {
            res.status(502).json({
                error: 'Laravel indisponível',
                detail: err.message,
                hint: 'Verifique o container conectaking-laravel'
            });
        }
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            res.status(504).json({ error: 'Laravel timeout' });
        }
    });

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
}

module.exports = {
    laravelProxyMiddleware,
    LARAVEL_ENABLED,
    LARAVEL_HOST,
    LARAVEL_PORT
};
