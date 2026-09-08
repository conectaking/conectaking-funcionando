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
const LARAVEL_KS = String(process.env.LARAVEL_KS || 'false').toLowerCase() === 'true';
const LARAVEL_ADMIN_BIBLE = String(process.env.LARAVEL_ADMIN_BIBLE || process.env.LARAVEL_SATELLITES || 'false').toLowerCase() === 'true';
const LARAVEL_CARD_SLUGS = new Set(
    String(process.env.LARAVEL_CARD_SLUGS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
);
const LARAVEL_KS_SLUGS = new Set(
    String(process.env.LARAVEL_KS_SLUGS || '')
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

function slugAllowedForKs(gallerySlug) {
    const s = String(gallerySlug || '').toLowerCase();
    if (!s) return false;
    if (LARAVEL_KS_SLUGS.size === 0) return true;
    return LARAVEL_KS_SLUGS.has(s);
}

function wantsNodeEngine(urlPath) {
    return /[?&](laravel|engine)=node(?:&|$)/i.test(String(urlPath || ''));
}

function wantsLaravelEngine(urlPath) {
    return /[?&](laravel|engine)=(1|true|laravel)(?:&|$)/i.test(String(urlPath || ''));
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
        /^\/api\/bible\/salmo-do-dia$/i,
        /^\/api\/bible\/devocional-biblia-inteira$/i,
        /^\/api\/bible\/reading-plan\/day\/\d+$/i,
        /^\/api\/bible\/prosperidade\/ativacao\/\d+$/i,
        /^\/api\/bible\/prosperidade\/hoje$/i,
        /^\/api\/bible\/prosperidade\/list$/i,
        /^\/api\/bible\/prosperidade\/nearest-published\/\d+$/i,
        /^\/api\/bible\/prosperidade\/mark-read$/i,
        /^\/api\/bible\/prosperidade\/read-status$/i,
        /^\/api\/bible\/devotional\/mark-read$/i,
        /^\/api\/bible\/devotional\/read-status$/i,
        /^\/l\/api\/pix\/qrcode\/\d+$/i,
        /^\/l\/api\/bible\/verse-of-day$/i,
        /^\/l\/api\/bible\/books$/i,
        /^\/l\/api\/bible\/book\/[^/]+\/\d+$/i,
        /^\/l\/api\/bible\/study\/books$/i,
        /^\/l\/api\/bible\/study\/book\/[^/]+$/i,
        /^\/l\/api\/bible\/devocional-do-dia$/i,
        /^\/l\/api\/bible\/salmo-do-dia$/i,
        /^\/l\/api\/bible\/devocional-biblia-inteira$/i,
        /^\/l\/api\/bible\/devotionals-365\/\d+$/i,
        /^\/l\/api\/bible\/reading-plan\/day\/\d+$/i,
        /^\/l\/api\/bible\/prosperidade\/ativacao\/\d+$/i,
        /^\/l\/api\/bible\/prosperidade\/hoje$/i,
        /^\/l\/api\/bible\/prosperidade\/list$/i,
        /^\/l\/api\/bible\/prosperidade\/nearest-published\/\d+$/i,
        /^\/l\/api\/bible\/prosperidade\/mark-read$/i,
        /^\/l\/api\/bible\/prosperidade\/read-status$/i,
        /^\/l\/api\/bible\/devotional\/mark-read$/i,
        /^\/l\/api\/bible\/devotional\/read-status$/i,
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
    // Devocional 365 completo no Laravel (plain + temas; IA se chave OpenAI / ai!=0)
    if (/^\/(?:l\/)?api\/bible\/devotionals-365\/\d+$/i.test(pathOnly)) return true;
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
    if (method === 'GET' && /^\/(?:l\/)?api\/bible\/my-progress$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/bible\/mark-read$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/bible\/reset-progress$/i.test(pathOnly)) return true;
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

    const formItem = pathOnly.match(/^\/([^/]+)\/form\/(\d+)(?:\/(submit|success))?$/i);
    if (formItem) {
        if (!force && !LARAVEL_SATELLITES) return false;
        if (!force && !slugAllowedForSatellite(formItem[1])) return false;
        const action = (formItem[3] || '').toLowerCase();
        if (action === 'submit') return method === 'POST';
        if (action === 'success') return method === 'GET';
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

    const bibleSalmo = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/salmo\/?$/i);
    if (bibleSalmo && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleSalmo[1]);
    }

    const biblePlan = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/plano(?:\/(\d+))?\/?$/i);
    if (biblePlan && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(biblePlan[1]);
    }

    const bibleWhole = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/biblia-inteira(?:\/(\d+))?\/?$/i);
    if (bibleWhole && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleWhole[1]);
    }

    const biblePros = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/prosperidade(?:\/(\d+))?\/?$/i);
    if (biblePros && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(biblePros[1]);
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

function isLaravelKsPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);

    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/gallery$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    const share = pathOnly.match(/^\/(?:l\/)?api\/king-selection\/public\/gallery-share-meta\/([^/]+)\/?$/i);
    if (share && method === 'GET') {
        if (!force && !LARAVEL_KS) return false;
        return force || slugAllowedForKs(share[1]);
    }
    const page = pathOnly.match(/^\/(?:l\/)?kingSelection\/([^/]+)\/?$/i);
    if (page && method === 'GET') {
        if (!force && !LARAVEL_KS) return false;
        return force || slugAllowedForKs(page[1]);
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/(cover|og-image)$/i.test(pathOnly)) {
        // cover/og usam ?slug= — canário via query
        if (!force && !LARAVEL_KS) return false;
        const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
        const m = /[?&]slug=([^&]+)/i.exec(q);
        const slug = m ? decodeURIComponent(m[1]) : '';
        if (!slug) return force || LARAVEL_KS;
        return force || slugAllowedForKs(slug);
    }
    return false;
}

function isLaravelGuestListPath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);

    // Personalização (auth JWT) — satélites ou profile API
    if (/^\/(?:l\/)?api\/guest-lists\/\d+\/customize-(portaria|confirmacao|inscricao)$/i.test(pathOnly)
        && (method === 'GET' || method === 'PUT')) {
        return force || LARAVEL_SATELLITES || LARAVEL_PROFILE_API;
    }

    if (!force && !LARAVEL_SATELLITES) return false;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/register\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/guest-lists\/public\/register\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/confirm\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/guest-lists\/public\/confirm\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?portaria\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?portaria\/[^/]+\/checkin\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/view-full\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/guest-list\/view-full\/[^/]+\/checkin\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/verify\/qr\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?guest-list\/confirm\/qr\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?guest-list\/confirm\/cpf$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelAdminBiblePath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);
    if (!force && !LARAVEL_ADMIN_BIBLE) return false;

    // Lote assíncrono / jobs / parse-paste / range-month permanecem no Node
    if (/\/generate-range-ai$/i.test(pathOnly)) return false;
    if (/\/generate-month-ai\//i.test(pathOnly)) return false;
    if (/\/generate-calendar-months-async$/i.test(pathOnly)) return false;
    if (/\/generation-job\//i.test(pathOnly)) return false;
    if (/\/parse-paste$/i.test(pathOnly)) return false;

    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/export$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/import$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/storytelling-map$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/save-activation$/i.test(pathOnly)) return true;
    if (method === 'PATCH' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/publish$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/generate-ai$/i.test(pathOnly)) return true;

    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/days$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/admin-full$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/day\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/day\/\d+\/generate-ai$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+\/generate\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+\/generate-all$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/\d+$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/\d+$/i.test(pathOnly)) return true;
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

    if ((LARAVEL_SATELLITES || wantsLaravelEngine(url)) && isLaravelSatellitePath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (isLaravelGuestListPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (isLaravelAdminBiblePath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false, timeoutMs: 180000 });
    }

    if ((LARAVEL_KS || wantsLaravelEngine(url)) && isLaravelKsPath(req.method, url)) {
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
    LARAVEL_KS,
    LARAVEL_CARD_SLUGS,
    LARAVEL_KS_SLUGS,
    LARAVEL_HOST,
    LARAVEL_PORT
};
