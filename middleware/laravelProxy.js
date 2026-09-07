/**
 * Proxy Node → Laravel (cartão virtual).
 *
 * - /l/* sempre (se LARAVEL_CARD_ENABLED)
 * - /:slug só com flag LARAVEL_CARD_PUBLIC ou ?laravel=1
 * - Canário: LARAVEL_CARD_SLUGS=slug1,slug2
 * - APIs cartão / profile / upload / satélites (flags)
 */
const http = require('http');

const LARAVEL_ENABLED = String(process.env.LARAVEL_CARD_ENABLED || 'true').toLowerCase() !== 'false';
const LARAVEL_HOST = process.env.LARAVEL_HOST || '127.0.0.1';
const LARAVEL_PORT = Number(process.env.LARAVEL_PORT || 8080);
const LARAVEL_CARD_PUBLIC = String(process.env.LARAVEL_CARD_PUBLIC || 'false').toLowerCase() === 'true';
const LARAVEL_CARD_APIS = String(process.env.LARAVEL_CARD_APIS || 'true').toLowerCase() !== 'false';
const LARAVEL_PROFILE_API = String(process.env.LARAVEL_PROFILE_API || 'false').toLowerCase() === 'true';
const LARAVEL_UPLOAD_API = String(process.env.LARAVEL_UPLOAD_API || 'false').toLowerCase() === 'true';
const LARAVEL_SATELLITES = String(process.env.LARAVEL_SATELLITES || 'false').toLowerCase() === 'true';
const LARAVEL_CARD_SLUGS = new Set(
    String(process.env.LARAVEL_CARD_SLUGS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
);

const RESERVED_STORE_SEGMENTS = new Set([
    'form', 'forms', 'biblia', 'bible', 'produto', 'product', 'king-selection', 'kingselection',
    'api', 'l', 'dashboard', 'login', 'admin', 'upload', 'uploads', 'vcard', 'log', 'card',
    'download', 'health', 'static', 'js', 'css', 'img', 'assets', 'public', 'loja'
]);

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

function slugAllowedForSatellite(slug) {
    const s = String(slug || '').toLowerCase();
    if (!s) return false;
    if (LARAVEL_CARD_SLUGS.size === 0) return true;
    return LARAVEL_CARD_SLUGS.has(s);
}

function isLaravelCardApiPath(urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const patterns = [
        /^\/api\/pix\/qrcode\/\d+$/i,
        /^\/api\/bible\/verse-of-day$/i,
        /^\/api\/bible\/books$/i,
        /^\/api\/bible\/book\/[^/]+\/\d+$/i,
        /^\/api\/bible\/study\/books$/i,
        /^\/api\/bible\/study\/book\/[^/]+$/i,
        /^\/api\/bible\/devocional-do-dia$/i,
        /^\/api\/bible\/reading-plan\/day\/\d+$/i,
        /^\/l\/api\/pix\/qrcode\/\d+$/i,
        /^\/l\/api\/bible\/verse-of-day$/i,
        /^\/l\/api\/bible\/books$/i,
        /^\/l\/api\/bible\/book\/[^/]+\/\d+$/i,
        /^\/l\/api\/bible\/study\/books$/i,
        /^\/l\/api\/bible\/study\/book\/[^/]+$/i,
        /^\/l\/api\/bible\/devocional-do-dia$/i,
        /^\/l\/api\/bible\/devotionals-365\/\d+$/i,
        /^\/l\/api\/bible\/reading-plan\/day\/\d+$/i,
        /^\/log\/view\/[^/]+$/i,
        /^\/log\/click\/item\/\d+$/i,
        /^\/log\/vcard\/[^/]+$/i,
        /^\/l\/log\/view\/[^/]+$/i,
        /^\/l\/log\/click\/item\/\d+$/i,
        /^\/l\/log\/vcard\/[^/]+$/i,
        /^\/vcard\/[^/]+$/i,
        /^\/l\/vcard\/[^/]+$/i,
        /^\/download\/pdf\/\d+$/i,
        /^\/l\/download\/pdf\/\d+$/i,
    ];
    if (patterns.some((re) => re.test(pathOnly))) return true;
    // Devocional 365 no Laravel só no modo plain (IA enriquecida permanece no Node)
    if (/^\/api\/bible\/devotionals-365\/\d+$/i.test(pathOnly)
        && /[?&]plain=(1|true|db)(?:&|$)/i.test(urlPath)) {
        return true;
    }
    return false;
}

function isLaravelProfileApiPath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'GET' && (pathOnly === '/api/profile' || pathOnly === '/l/api/profile')) return true;
    if (method === 'PUT' && (pathOnly === '/api/profile/save-all' || pathOnly === '/l/api/profile/save-all')) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/profile\/(?:avatar-format|share-image)$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/profile\/import-form-info$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/import-form$/i.test(pathOnly)) return true;

    const itemsRoot = /^\/(?:l\/)?api\/profile\/items$/i;
    const itemsId = /^\/(?:l\/)?api\/profile\/items\/\d+$/i;
    if (itemsRoot.test(pathOnly) && (method === 'GET' || method === 'POST')) return true;
    if (itemsId.test(pathOnly) && (method === 'GET' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) return true;

    const typed = /^\/(?:l\/)?api\/profile\/items\/(banner|link|carousel|pix|pdf|digital_form)\/\d+$/i;
    if (method === 'PUT' && typed.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/\d+\/duplicate$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/repair-sales-pages$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/(responses|dashboard)$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/responses\/delete-bulk$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/responses\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/create-import-link$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelUploadPath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'POST' && /^\/(?:l\/)?api\/upload\/(auth|receive-one|image|images|crop|pdf)$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/upload\/get-url\/[^/]+$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelSatellitePath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
    const force = /[?&](laravel|engine)=(1|true|laravel)/i.test(q);

    if (method === 'GET' && /^\/(?:l\/)?form\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/l\/loja\/[^/]+\/[^/]+$/i.test(pathOnly)) return true;

    const formItem = pathOnly.match(/^\/([^/]+)\/form\/(\d+)(\/submit)?$/i);
    if (formItem) {
        if (!force && !LARAVEL_SATELLITES) return false;
        if (!force && !slugAllowedForSatellite(formItem[1])) return false;
        if (formItem[3]) return method === 'POST';
        return method === 'GET';
    }

    const bible = pathOnly.match(/^\/([^/]+)\/biblia\/?$/i);
    if (bible && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bible[1]);
    }

    const bibleStudy = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/estudos-livro(?:\/([^/]+))?\/?$/i);
    if (bibleStudy && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleStudy[1]);
    }

    const bibleDev = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/devocional(?:\/(\d+))?\/?$/i);
    if (bibleDev && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleDev[1]);
    }

    const bibleStudyLegacy = pathOnly.match(/^\/([^/]+)\/bible\/estudo-livro\/([^/]+)\/?$/i);
    if (bibleStudyLegacy && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleStudyLegacy[1]);
    }

    const bibleEn = pathOnly.match(/^\/(?:l\/)?([^/]+)\/bible\/?$/i);
    if (bibleEn && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleEn[1]);
    }

    const bibleReader = pathOnly.match(/^\/(?:l\/)?([^/]+)\/bible\/([^/]+)\/(\d+)\/?$/i);
    if (bibleReader && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleReader[1]);
    }

    const store = pathOnly.match(/^\/([^/]+)\/([^/]+)\/?$/i);
    if (store && method === 'GET') {
        const profileSlug = store[1];
        const storeSlug = store[2];
        if (RESERVED_STORE_SEGMENTS.has(String(storeSlug).toLowerCase())) return false;
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(profileSlug);
    }
    return false;
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

function proxyToLaravel(req, res, targetPath, { publicMode = false, timeoutMs = 20000 } = {}) {
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
        timeout: timeoutMs
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
            const pathOnly = String(targetPath || '').split('?')[0];
            if (pathOnly.startsWith('/api/') || pathOnly.startsWith('/l/api/')) {
                res.status(502).json({
                    success: false,
                    message: 'Motor Laravel offline. Tente novamente.'
                });
            } else {
                res.status(502).send(
                    '<h1>Temporariamente indisponível</h1><p>Motor Laravel offline. Tente novamente.</p>'
                );
            }
        }
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            const pathOnly = String(targetPath || '').split('?')[0];
            if (pathOnly.startsWith('/api/') || pathOnly.startsWith('/l/api/')) {
                res.status(504).json({ success: false, message: 'Laravel demorou demais.' });
            } else {
                res.status(504).send('<h1>Timeout</h1><p>Laravel demorou demais.</p>');
            }
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

    if (LARAVEL_CARD_APIS && isLaravelCardApiPath(url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (LARAVEL_PROFILE_API && isLaravelProfileApiPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (LARAVEL_UPLOAD_API && isLaravelUploadPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false, timeoutMs: 120000 });
    }

    if ((LARAVEL_SATELLITES || /[?&](laravel|engine)=(1|true|laravel)/i.test(url)) && isLaravelSatellitePath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (!url.startsWith('/l/') && url !== '/l') return next();
    return proxyToLaravel(req, res, url, { publicMode: false });
}

function proxyPublicCardToLaravel(req, res, slug) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetPath = `/l/card/${encodeURIComponent(slug)}${qs}`;
    return proxyToLaravel(req, res, targetPath, { publicMode: true });
}

module.exports = {
    laravelProxyMiddleware,
    proxyPublicCardToLaravel,
    shouldServePublicCardWithLaravel,
    isLaravelCardApiPath,
    LARAVEL_ENABLED,
    LARAVEL_CARD_PUBLIC,
    LARAVEL_CARD_APIS,
    LARAVEL_PROFILE_API,
    LARAVEL_UPLOAD_API,
    LARAVEL_SATELLITES,
    LARAVEL_CARD_SLUGS,
    LARAVEL_HOST,
    LARAVEL_PORT
};
