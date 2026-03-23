require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Logar erros não tratados para aparecer nos logs do Render (evita "Exited with status 1" sem causa visível)
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection]', reason);
    process.exit(1);
});

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const cron = require('node-cron');
const db = require('./db');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('./config');
const { fetchKingSelectionOgData, ensureHttpsUrl, defaultOgImageUrl, ogImageUrlForGallerySlug } = require('./utils/kingSelectionOg');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { spawn } = require('child_process');

const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiry');
const generatorRoutes = require('./routes/generator');
const accountRoutes = require('./routes/account');
const profileRoutes = require('./routes/profile');
const publicProfileRoutes = require('./routes/publicProfile');
const mainRoutes = require('./modules/main/main.routes');
const subscriptionRoutes = require('./routes/subscription');
const moduleAvailabilityRoutes = require('./routes/moduleAvailability');
const loggerRoutes = require('./routes/logger');
const adminRoutes = require('./routes/admin');
const adminBibleStudyRoutes = require('./routes/adminBibleStudy');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const pdfUploadRoutes = require('./routes/pdf-upload');
const downloadRoutes = require('./routes/download');
const pixRoutes = require('./routes/pix');
const businessRoutes = require('./routes/business');
const paymentRoutes = require('./routes/payment');
const vcardRoutes = require('./routes/vcard');
const healthModule = require('./routes/health');
const healthRoutes = healthModule;
const healthHandler = healthModule.healthHandler;
const passwordRoutes = require('./routes/password');
const imageProxyRoutes = require('./routes/imageProxy');
const ogImageRoutes = require('./routes/ogImage');
const publicSalesPageRoutes = require('./routes/publicSalesPage.routes');
const salesPageRoutes = require('./modules/salesPage/salesPage.routes');
const productRoutes = require('./modules/salesPage/products/product.routes');
const analyticsRoutesSalesPage = require('./modules/salesPage/analytics/analytics.routes');
const suggestionsRoutes = require('./routes/suggestions');
const contractsRoutes = require('./modules/contracts/contract.routes');
const guestListRoutes = require('./routes/guestList.routes');
const publicGuestListRoutes = require('./routes/publicGuestList.routes');
const cadastroLinksRoutes = require('./routes/cadastroLinks.routes');
const guestListCustomizeRoutes = require('./routes/guestListCustomize.routes');
const publicContractRoutes = require('./routes/publicContract.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const pushNotificationsRoutes = require('./routes/pushNotifications.routes');
const checkinRoutes = require('./routes/checkin.routes');
const linkLimitsRoutes = require('./modules/linkLimits/linkLimits.routes');
const checkoutRoutes = require('./modules/checkout/checkout.routes');
const checkoutWebhookRoutes = require('./modules/checkout/webhook.routes');
const kingSelectionRoutes = require('./routes/kingSelection.routes');
const kingbriefRoutes = require('./routes/kingbrief.routes');
const requestLogger = require('./middleware/requestLogger');
const { securityHeaders, validateRequestSize, botLimiter } = require('./middleware/security');
const autoMigrate = require('./utils/auto-migrate');

const app = express();

// Configurar trust proxy para funcionar corretamente atrás do proxy do Render
app.set('trust proxy', true);

// CORS antes de /health: Live Server (5500) → API local (5000) precisa de Access-Control-Allow-Origin no warm-up
app.use(cors(config.cors));

// Health check na raiz (após CORS; mantém resposta simples para load balancers)
app.get('/health', (req, res, next) => Promise.resolve(healthHandler(req, res)).catch(next));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://www.instagram.com",
                "https://*.instagram.com",
                "https://snapwidget.com",
                "https://*.snapwidget.com",
                "https://lightwidget.com",
                "https://*.lightwidget.com",
                "https://sdk.mercadopago.com",
                "https://www.youtube.com",
                "https://www.youtube.com/iframe_api",
                "https://www.googletagmanager.com",
                "https://unpkg.com",
                "blob:"
            ],
            scriptSrcAttr: [
                "'unsafe-inline'"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "https://unpkg.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https://imagedelivery.net",
                "https://r2.conectaking.com.br",
                "https://*.conectaking.com.br",
                "https://i.ibb.co",
                "https://i.pravatar.cc",
                "https://avatar.iran.liara.run",
                "https://images.unsplash.com",
                "https://*.unsplash.com",
                "https://res.cloudinary.com",
                "https://*.cloudinary.com",
                "https://i.imgur.com",
                "https://*.imgbb.com",
                "https://*.imgbb.cn",
                "https://*.youtube.com",
                "https://*.googlevideo.com",
                "https://i.ytimg.com",
                "https://www.google-analytics.com",
                "https://*.google-analytics.com",
                "https://www.googletagmanager.com",
                "https://stats.g.doubleclick.net",
                "https://*.instagram.com",
                "https://*.cdninstagram.com",
                "https://*.fbcdn.net",
                "https://snapwidget.com",
                "https://*.snapwidget.com",
                "https://lightwidget.com",
                "https://*.lightwidget.com",
                "https://*.tile.openstreetmap.org",
                "https://*.basemaps.cartocdn.com",
                "https://server.arcgisonline.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            frameSrc: [
                "'self'",
                "https://www.instagram.com",
                "https://*.instagram.com",
                "https://snapwidget.com",
                "https://*.snapwidget.com",
                "https://lightwidget.com",
                "https://*.lightwidget.com",
                "https://www.youtube.com",
                "https://*.youtube.com",
                "https://*.googlevideo.com",
                "https://www.google.com",
                "https://*.google.com",
                "https://www.openstreetmap.org"
            ],
            connectSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://conectaking-api.onrender.com",
                "https://bio.conectaking.com.br",
                "https://www.instagram.com",
                "https://*.instagram.com",
                "https://*.cdninstagram.com",
                "https://*.fbcdn.net",
                "https://snapwidget.com",
                "https://*.snapwidget.com",
                "https://lightwidget.com",
                "https://*.lightwidget.com",
                "https://www.youtube.com",
                "https://*.youtube.com",
                "https://*.googlevideo.com",
                "https://manifest.googlevideo.com",
                "https://www.google-analytics.com",
                "https://*.google-analytics.com",
                "https://google-analytics.com",
                "https://www.googletagmanager.com",
                "https://googletagmanager.com",
                "https://stats.g.doubleclick.net",
                "https://www.google.com",
                "https://overbridgenet.com",
                "https://*.overbridgenet.com",
                "https://nominatim.openstreetmap.org",
                "https://*.tile.openstreetmap.org",
                "https://*.basemaps.cartocdn.com",
                "https://photon.komoot.io"
            ],
            mediaSrc: [
                "'self'",
                "https://*.youtube.com",
                "https://*.googlevideo.com",
                "https://tts.conectaking.com.br"
            ],
            frameAncestors: [
                "'self'",
                "http://127.0.0.1:*",
                "http://localhost:*",
                "https://*.conectaking.com.br",
                "https://conectaking-api.onrender.com"
            ]
        }
    },
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin"
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiters
// Nota: trust proxy já está configurado acima, então express-rate-limit usará X-Forwarded-For corretamente
// Validate trust proxy está desabilitado porque estamos no Render que gerencia o proxy corretamente

// Skip OPTIONS requests (CORS preflight) no rate limit
const skipOptions = (req) => {
    return req.method === 'OPTIONS';
};

const authLimiter = rateLimit({
    windowMs: config.rateLimit.auth.windowMs,
    max: config.rateLimit.auth.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    message: 'Muitas tentativas de login/registro. Tente novamente em 15 minutos.'
});

const uploadLimiter = rateLimit({
    windowMs: config.rateLimit.upload.windowMs,
    max: config.rateLimit.upload.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    message: 'Muitos uploads realizados. Tente novamente mais tarde.'
});

// Rate limit diferenciado para check-in (120 requisições por minuto)
const checkinLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 120, // 120 requisições por minuto
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    message: 'Muitas requisições de check-in. Aguarde um momento.',
    handler: (req, res) => {
        logger.warn('Rate limit de check-in excedido', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'Muitas requisições de check-in. Aguarde um momento antes de tentar novamente.',
            retryAfter: 60
        });
    }
});

// Rate limit diferenciado para admin (30 requisições por minuto)
const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 requisições por minuto
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    message: 'Muitas requisições administrativas. Aguarde um momento.',
    handler: (req, res) => {
        logger.warn('Rate limit administrativo excedido', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'Muitas requisições administrativas. Aguarde um momento.',
            retryAfter: 60
        });
    }
});

const apiLimiter = rateLimit({
    windowMs: config.rateLimit.api.windowMs,
    max: config.rateLimit.api.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    message: 'Muitas requisições. Tente novamente mais tarde.',
    handler: (req, res) => {
        logger.warn('Rate limit excedido', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        // Retornar header Retry-After para ajudar o cliente
        const retryAfter = Math.ceil(config.rateLimit.api.windowMs / 1000);
        res.set('Retry-After', retryAfter);
        res.status(429).json({
            success: false,
            message: `Muitas requisições. Tente novamente em ${Math.ceil(retryAfter / 60)} minutos.`,
            retryAfter: retryAfter
        });
    }
});

// KingSelection: upload em massa gera muitas chamadas (auth + salvar fotos).
// Usamos um rate limit mais alto aqui para não travar o fluxo de upload do fotógrafo.
const kingSelectionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5000, // suficiente para 1000+ uploads + operações auxiliares
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: skipOptions,
    message: 'Muitas requisições de galeria. Aguarde um momento.',
    handler: (req, res) => {
        logger.warn('Rate limit KingSelection excedido', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        const retryAfter = 60;
        res.set('Retry-After', retryAfter);
        res.status(429).json({
            success: false,
            message: 'Muitas requisições de galeria. Aguarde 1 minuto e tente novamente.',
            retryAfter: retryAfter
        });
    }
});

const kingbriefLimiter = rateLimit({
    windowMs: config.rateLimit.kingbrief.windowMs,
    max: config.rateLimit.kingbrief.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV === 'development',
    message: 'Muitos processamentos de áudio. Aguarde 1 hora para tentar novamente.',
});

cron.schedule('0 8 * * *', async () => {
    logger.info('Executando verificação diária de assinaturas...');
    const client = await db.pool.connect();
    try {
        const expiringSoon = await client.query("SELECT email FROM users WHERE subscription_expires_at BETWEEN NOW() + interval '2 days' AND NOW() + interval '3 days' AND subscription_status = 'active'");

        if (expiringSoon.rows.length > 0) {
            logger.info(`Encontrados ${expiringSoon.rows.length} usuários com assinaturas expirando em 3 dias.`);
        }

        const expired = await client.query("UPDATE users SET account_type = 'free', subscription_status = 'expired' WHERE subscription_expires_at < NOW() AND (subscription_status = 'active' OR subscription_status = 'active_onetime') RETURNING email");

        if (expired.rows.length > 0) {
            logger.info(`Total de ${expired.rows.length} assinaturas expiradas foram desativadas.`);
        }

    } catch (error) {
        logger.error('Erro na tarefa agendada de verificação de assinaturas', error);
    } finally {
        client.release();
    }
});

app.use(compression());

// URL pública da API (para o dashboard em localhost usar este domínio e evitar CORS por redirect em conectaking.com.br)
const PUBLIC_API_BASE = (process.env.API_URL || 'https://conectaking-api.onrender.com').toString().trim().replace(/\/$/, '');
app.get('/api/public-api-url', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ apiBaseUrl: PUBLIC_API_BASE });
});
// Script para o dashboard incluir: <script src="https://conectaking-api.onrender.com/api-config.js"></script>
// Define API_BASE e intercepta fetch() para enviar pedidos /api/* para a API no Render (evita CORS/404 em conectaking.com.br)
app.get('/api-config.js', (req, res) => {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    // Base desta instância (ex.: http://127.0.0.1:5000) para o fetch patch não forçar Render em dev
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').toString().split(',')[0].trim();
    const host = (req.get('x-forwarded-host') || req.get('host') || `localhost:${config.port}`).toString().split(',')[0].trim();
    const selfBase = `${proto}://${host}`.replace(/\/$/, '');
    const base = JSON.stringify(selfBase);
    res.send(
`window.CONECTAKING_API_BASE = ${base};
window.API_BASE = window.API_BASE || ${base};
(function(){
  var apiBase = ${base};
  var nativeFetch = window.fetch;
  if (!nativeFetch) return;
  function getToken() {
    try {
      return (typeof localStorage !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('conectaKingToken'))) || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) || '';
    } catch (e) { return ''; }
  }
  window.fetch = function(input, opts) {
    opts = opts || {};
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var finalUrl = url;
    if (url && (url.indexOf('/api/') === 0 || url.indexOf('api/') === 0)) {
      finalUrl = url.indexOf('http') === 0 ? url : apiBase.replace(/\\/$/, '') + (url.indexOf('/') === 0 ? url : '/' + url);
    } else if (url && url.indexOf('conectaking.com.br') !== -1 && url.indexOf('/api/') !== -1) {
      finalUrl = url.replace(/^https?:\\/\\/[^\\/]+/, apiBase);
    }
    var isApiUrl = (finalUrl && (finalUrl.indexOf(apiBase) === 0 || finalUrl.indexOf('conectaking-api.onrender.com') !== -1)) || (url && url.indexOf('/api/') === 0);
    if (isApiUrl) {
      var headers = opts.headers || (opts.headers = {});
      if (!(headers.Authorization || (headers.get && headers.get('Authorization')))) {
        var token = getToken();
        if (token) {
          if (typeof headers.set === 'function') headers.set('Authorization', 'Bearer ' + token);
          else if (Object.prototype.toString.call(headers) === '[object Headers]') headers.set('Authorization', 'Bearer ' + token);
          else headers.Authorization = 'Bearer ' + token;
        }
      }
    }
    if (finalUrl === url) return nativeFetch.apply(this, arguments);
    var finalInput = typeof input === 'string' ? finalUrl : (typeof Request !== 'undefined' ? new Request(finalUrl, input) : finalUrl);
    return nativeFetch.call(this, finalInput, opts);
  };
})();
`
    );
});

app.use(securityHeaders); // Headers de segurança
app.use(validateRequestSize(config.upload.maxFileSize)); // Valida tamanho de requisição
app.use(express.json({ limit: `${config.upload.maxFileSize / 1024 / 1024}mb` }));
app.use(requestLogger);

// public_html (KingSelection cliente + express.static)
const publicHtmlDir = path.join(__dirname, 'public_html');
const kingSelectionClienteHtml = path.join(publicHtmlDir, 'kingSelectionCliente.html');
const kingSelectionEditHtml = path.join(publicHtmlDir, 'kingSelectionEdit.html');
const KING_SELECTION_CLIENTE_RESERVED_SLUGS = new Set([
    'admin',
    'api',
    'assets',
    'static',
    'login',
    'build',
    'vendor',
    'storage',
    'public'
]);

let kingSelectionClienteHtmlTemplate = null;

function loadKingSelectionClienteHtmlTemplate() {
    if (!kingSelectionClienteHtmlTemplate && fs.existsSync(kingSelectionClienteHtml)) {
        kingSelectionClienteHtmlTemplate = fs.readFileSync(kingSelectionClienteHtml, 'utf8');
    }
    return kingSelectionClienteHtmlTemplate;
}

function escHtmlAttr(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

async function serveKingSelectionClienteGallery(req, res, next) {
    const slug = req.params.slug;
    if (!slug || KING_SELECTION_CLIENTE_RESERVED_SLUGS.has(String(slug).toLowerCase())) {
        return next();
    }
    const tpl = loadKingSelectionClienteHtmlTemplate();
    if (!tpl) return next();

    const defaultOgImage = defaultOgImageUrl();
    let pageTitle = 'King Selection — Galeria';
    let ogTitle = pageTitle;
    let ogDesc = 'Aceda à sua galeria King Selection e selecione as suas fotografias.';
    let ogImage = defaultOgImage;
    let canonical = '';

    try {
        const og = await fetchKingSelectionOgData(db.pool, slug);
        if (og) {
            ogTitle = `${og.title} — King Selection`;
            pageTitle = ogTitle;
            ogDesc = `Galeria de fotos: ${og.title}. Entre para ver e selecionar as imagens.`;
            ogImage = ogImageUrlForGallerySlug(og.slug) || ensureHttpsUrl(og.imageUrl) || defaultOgImage;
        }
        const protoHdr = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
        const proto = protoHdr.split(',')[0].trim().split(/\s+/)[0] || 'https';
        const hostHdr = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
        const host = hostHdr.split(',')[0].trim();
        const slugForPath = og && og.slug ? og.slug : slug;
        const path = `/kingSelection/${encodeURIComponent(String(slugForPath))}`;
        if (host) canonical = `${proto}://${host}${path}`;
    } catch (e) {
        logger.warn('KingSelection OG: falha ao montar meta', { message: e.message });
    }

    const metaBlock = [
        '<meta property="og:type" content="website" />',
        canonical ? `<meta property="og:url" content="${escHtmlAttr(canonical)}" />` : '',
        `<meta property="og:title" content="${escHtmlAttr(ogTitle)}" />`,
        `<meta property="og:description" content="${escHtmlAttr(ogDesc)}" />`,
        `<meta property="og:image" content="${escHtmlAttr(ogImage)}" />`,
        `<meta property="og:image:secure_url" content="${escHtmlAttr(ogImage)}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:title" content="${escHtmlAttr(ogTitle)}" />`,
        `<meta name="twitter:description" content="${escHtmlAttr(ogDesc)}" />`,
        `<meta name="twitter:image" content="${escHtmlAttr(ogImage)}" />`
    ]
        .filter(Boolean)
        .join('\n  ');

    let html = tpl.replace('</head>', `  ${metaBlock}\n</head>`);
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtmlAttr(pageTitle)}</title>`);

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('html').send(html);
}

// ============================================
// KingSelection (Laravel) - Proxy por caminho
// Mantém o mesmo domínio: /kingselection/*
// ============================================
function proxyKingSelection(req, res, next) {
    const base = process.env.KINGSELECTION_BASE_URL;
    if (!base) {
        return res.status(503).json({
            success: false,
            message: 'KingSelection indisponível (KINGSELECTION_BASE_URL não configurada).'
        });
    }

    let targetBase;
    try {
        targetBase = new URL(base);
    } catch (e) {
        return res.status(500).json({
            success: false,
            message: 'Config inválida: KINGSELECTION_BASE_URL não é uma URL válida.'
        });
    }

    // Express ao montar em /kingselection, deixa req.url como o caminho relativo (ex.: /admin?x=1)
    const targetUrl = new URL(req.url || '/', targetBase);
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    // Copiar headers e ajustar host
    const headers = { ...req.headers };
    headers.host = targetUrl.host;
    headers['x-forwarded-host'] = headers['x-forwarded-host'] || req.get('host');
    headers['x-forwarded-proto'] = headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    headers['x-forwarded-for'] = headers['x-forwarded-for'] || req.ip;
    headers['x-forwarded-prefix'] = headers['x-forwarded-prefix'] || '/kingselection';

    const proxyReq = lib.request(
        {
            protocol: targetUrl.protocol,
            hostname: targetUrl.hostname,
            port: targetUrl.port || (isHttps ? 443 : 80),
            method: req.method,
            path: targetUrl.pathname + targetUrl.search,
            headers
        },
        (proxyRes) => {
            res.status(proxyRes.statusCode || 502);
            // Repasse de headers (evitar sobrescrever headers proibidos pelo Node)
            Object.entries(proxyRes.headers || {}).forEach(([k, v]) => {
                if (typeof v !== 'undefined') res.setHeader(k, v);
            });
            proxyRes.pipe(res);
        }
    );

    proxyReq.on('error', (err) => {
        // Não quebrar o servidor por falha no proxy
        logger.error('❌ Erro no proxy do KingSelection', {
            message: err.message,
            target: String(targetUrl)
        });
        res.status(502).json({
            success: false,
            message: 'Falha ao conectar ao serviço do KingSelection.'
        });
    });

    // Enviar body (stream)
    if (req.readable) {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
}

// /kingSelection sem slug → painel do fotógrafo (mesmo ficheiro que kingSelectionEdit.html)
app.get(['/kingSelection', '/kingSelection/', '/kingselection', '/kingselection/'], (req, res, next) => {
    if (!fs.existsSync(kingSelectionEditHtml)) return next();
    res.sendFile(kingSelectionEditHtml);
});

// Galeria cliente (Node) ANTES do proxy.
// Aceita aliases para manter compatibilidade com links antigos/variantes enviados por WhatsApp.
app.get([
    '/kingselection/:slug',
    '/kingSelection/:slug',
    '/ringselection/:slug',
    '/ringsselection/:slug',
    '/mr/kingselection/:slug',
    '/mr/kingSelection/:slug',
    '/mr/ringselection/:slug',
    '/mr/ringsselection/:slug'
], asyncHandler(serveKingSelectionClienteGallery));
// Proxy Laravel: /kingselection/admin e demais rotas reservadas/subcaminhos
app.use('/kingselection', proxyKingSelection);

// ============================================
// Frontend estático (Hostinger → Render/Node)
// Serve public_html/ como origem do domínio
// ============================================
// Rota explícita para tts.js: garante Content-Type application/javascript (evita MIME text/html em 404)
app.get('/js/tts.js', (req, res) => {
    const ttsPath = path.join(publicHtmlDir, 'js', 'tts.js');
    if (fs.existsSync(ttsPath)) {
        res.type('application/javascript');
        res.sendFile(ttsPath);
    } else {
        res.status(404).type('text/plain').send('Not found');
    }
});
app.use(express.static(publicHtmlDir, {
    etag: false,
    lastModified: false,
    maxAge: 0,
    immutable: false,
    setHeaders: (res, filePath) => {
        // Forçar atualização dos arquivos do painel/landing
        if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        } else {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

// Servir arquivos estáticos SEM cache (forçar atualização no host)
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    maxAge: 0,
    immutable: false,
    setHeaders: (res, path) => {
        // Para arquivos JS, CSS e HTML, adicionar headers que forçam atualização
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        } else {
            // Demais assets (imagens, etc.) sem cache forte
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

// URL da logomarca (favicon em todas as páginas)
const logoFaviconUrl = process.env.FAVICON_URL || 'https://i.ibb.co/60sW9k75/logo.png';

// Rota para favicon: usa logomarca quando public/favicon.ico não existe
app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    res.sendFile(faviconPath, (err) => {
        if (err) {
            res.redirect(302, logoFaviconUrl);
        }
    });
});

// Compatibilidade: alguns clientes pedem /favico.ico (sem "n").
app.get('/favico.ico', (req, res) => {
    res.redirect(302, '/favicon.ico');
});

// Rota /logo.png para o painel e landing usarem como favicon (mesma origem ou API)
const rootLogoPath = path.join(__dirname, 'logo.png');
app.get('/logo.png', (req, res) => {
    if (fs.existsSync(rootLogoPath)) {
        res.type('image/png');
        res.sendFile(rootLogoPath);
    } else {
        res.redirect(302, logoFaviconUrl);
    }
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Favicon: logomarca em todas as páginas (usa mesma URL das rotas acima)
app.locals.faviconUrl = logoFaviconUrl;

// Cache-buster para assets estáticos em views EJS
const appVersion =
    process.env.APP_VERSION ||
    process.env.BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RENDER_GIT_COMMIT ||
    null;
app.use((req, res, next) => {
    res.locals.cacheBuster = appVersion || Date.now();
    next();
});

// Middleware para desabilitar cache em todas as rotas de views EJS
app.use((req, res, next) => {
    // Aplicar headers no-cache apenas para rotas que renderizam views (não para APIs JSON)
    if (req.path.includes('/produto/') || (!req.path.startsWith('/api') && !req.path.startsWith('/upload') && !req.path.endsWith('.json'))) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Last-Modified', new Date().toUTCString());
        res.set('ETag', `"${Date.now()}"`);
    }
    next();
});

// Rota raiz: página principal (domínio personalizado → site público; senão index.html ou JSON da API)
app.use('/', mainRoutes);

// Bloquear bots e scanners - ANTES de qualquer rota e ANTES do requestLogger
// Isso evita que requisições de bots sejam processadas ou logadas
app.use((req, res, next) => {
    const path = req.path.toLowerCase();
    // Nunca bloquear raiz nem path correto de API chamado sem prefixo (evita 403 em GET / e GET /plan-availability)
    if (path === '' || path === '/' || path === '/plan-availability') {
        return next();
    }
    const userAgent = (req.get('user-agent') || '').toLowerCase();

    // Lista expandida de padrões de bots/scanners
    // IMPORTANTE: Não incluir '/api' aqui pois bloqueia rotas válidas
    const botPatterns = [
        '/wordpress', '/wp-admin', '/wp-content', '/wp-includes', '/wp-login',
        '/setup-config.php', '/xmlrpc.php', '/readme.html', '/license.txt',
        '/phpmyadmin', '/phpinfo', '/administrator', '/.env', '/config.php',
        '/.git', '/backup', '/.sql', '/.bak', '/.old', '/test.php',
        '/shell.php', '/c99.php', '/r57.php', '/admin.php', '/login.php',
        '/index.php' // Bloquear acesso direto a index.php (não é usado no sistema)
    ];

    // Verificar se é acesso genérico a /api (sem rota específica) - apenas se for exatamente '/api'
    // IMPORTANTE: Não bloquear rotas válidas como /api/profile, /api/pix, etc.
    const isGenericApiAccess = path === '/api' && !req.path.startsWith('/api/');

    // Padrões de user-agent suspeitos (incluindo URLs como user-agent)
    const suspiciousUserAgents = [
        'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp', 'w3af',
        'dirbuster', 'gobuster', 'wfuzz', 'scanner', 'bot', 'crawler',
        'spider', 'scraper', 'http://', 'https://', // User-agent que é uma URL é suspeito
        'http://cnking.bio', 'https://cnking.bio', // User-agents que são URLs do próprio domínio
        'http://tag.conectaking.com.br', 'https://tag.conectaking.com.br'
    ];

    // Verificar se o path corresponde a padrões de bot
    const isBotPath = botPatterns.some(pattern => path.includes(pattern));

    // Verificar se o user-agent é suspeito (URL como user-agent é sempre suspeito)
    const isSuspiciousUA = suspiciousUserAgents.some(pattern => userAgent.includes(pattern)) ||
        userAgent.startsWith('http://') ||
        userAgent.startsWith('https://');

    // IMPORTANTE: NUNCA bloquear rotas válidas da API (que começam com /api/)
    // Apenas bloquear se NÃO for uma rota válida da API
    const isValidApiRoute = path.startsWith('/api/');

    // Bloquear se for path de bot OU user-agent suspeito OU acesso genérico a /api
    // MAS NUNCA bloquear rotas válidas da API
    if (!isValidApiRoute && (isBotPath || isSuspiciousUA || isGenericApiAccess)) {
        // Marcar como bot para não ser logado
        req._isBotRequest = true;

        // Não logar em produção para reduzir ruído (apenas em debug)
        if (!config.isProduction) {
            logger.debug('Tentativa de acesso bloqueada (bot/scanner)', {
                ip: req.ip,
                path: req.path,
                userAgent: req.get('user-agent')?.substring(0, 100),
                method: req.method,
                reason: isBotPath ? 'bot_path' : (isSuspiciousUA ? 'suspicious_ua' : 'generic_api')
            });
        }

        // Retornar resposta rápida sem processar
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    }

    next();
});

// Redirecionar GET /plan-availability para a rota correta (evita 403 quando o front chama sem /api/modules)
app.get('/plan-availability', (req, res) => {
    res.redirect(302, '/api/modules/plan-availability');
});

// API: health também em /api/health (rota raiz /health já registrada no início do server)
app.use('/api', healthRoutes);

// Aplicar rate limiting agressivo para rotas genéricas suspeitas
// Nota: Isso deve vir DEPOIS do bloqueio de bots acima, mas ANTES das rotas válidas
app.use((req, res, next) => {
    const path = req.path.toLowerCase();
    // Aplicar rate limit agressivo apenas para rotas genéricas suspeitas
    // (rotas válidas da API já têm seus próprios rate limiters)
    // IMPORTANTE: Não aplicar em rotas válidas da API como /api/profile, /api/pix, etc.
    const isValidApiRoute = path.startsWith('/api/') && (
        path.startsWith('/api/profile') ||
        path.startsWith('/api/pix') ||
        path.startsWith('/api/auth') ||
        path.startsWith('/api/health') ||
        path.startsWith('/api/account') ||
        path.startsWith('/api/subscription') ||
        path.startsWith('/api/modules') ||
        path.startsWith('/api/upload') ||
        path.startsWith('/api/analytics') ||
        path.startsWith('/api/business') ||
        path.startsWith('/api/contracts') ||
        path.startsWith('/api/guest-list') ||
        path.startsWith('/api/sales-page') ||
        path.startsWith('/api/products') ||
        path.startsWith('/api/suggestions') ||
        path.startsWith('/api/log') ||
        path.startsWith('/api/vcard') ||
        path.startsWith('/api/public') ||
        path.startsWith('/api/king-selection') ||
        path.startsWith('/api/documentos')
    );

    if (!isValidApiRoute && (
        (path === '/api' && !req.path.startsWith('/api/')) ||
        path === '/index.php' ||
        (path === '/admin' && !req.path.startsWith('/admin/')) ||
        path.startsWith('/wp-') ||
        path.includes('phpmyadmin') ||
        (path.includes('.php') && !path.includes('/api/')) ||
        path.includes('.sql')
    )) {
        return botLimiter(req, res, next);
    }
    next();
});

// ============================================
// ROTAS PÚBLICAS (SEM RATE LIMIT) - DEVEM VIR PRIMEIRO
// A rota /api/subscription/plans-public está definida em routes/subscription.js
// ============================================

// GET /api/modules/plan-availability-public está em modules/moduleAvailability (montado em /api/modules)

// ============================================
// ROTAS PROTEGIDAS COM RATE LIMIT
// ============================================
// Rotas de recuperação de senha
app.use('/api/password', passwordRoutes);

// Rotas da API com rate limiting apropriado
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/inquiry', apiLimiter, inquiryRoutes);
app.use('/api/generator', apiLimiter, generatorRoutes);
app.use('/api/account', apiLimiter, accountRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);
app.use('/api/subscription', apiLimiter, subscriptionRoutes);
app.use('/api/modules', apiLimiter, moduleAvailabilityRoutes);
app.use('/api/link-limits', apiLimiter, linkLimitsRoutes);
app.use('/log', loggerRoutes);
// Endpoint agregado de check-in (rate limit específico - 120/min)
app.use('/api/checkin', checkinLimiter, checkinRoutes);

app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/admin', adminLimiter, adminBibleStudyRoutes); // Estudos por livro: upload Word/PDF (apenas ADM)
app.use('/api/admin', adminLimiter, ogImageRoutes); // Rotas de personalização de link (apenas ADM)
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/upload/pdf', uploadLimiter, pdfUploadRoutes);
// Upload: libera /auth (muitas chamadas durante upload em massa).
app.use('/api/upload', (req, res, next) => {
    // req.path aqui já é relativo ao mount (/api/upload)
    if (req.path === '/auth') return next();
    return uploadLimiter(req, res, next);
}, uploadRoutes);

// KingSelection: rate limit mais alto para upload em massa
app.use('/api/king-selection', kingSelectionLimiter, kingSelectionRoutes);
app.use('/api/kingbrief', kingbriefLimiter, kingbriefRoutes);
app.use('/download', downloadRoutes);
app.use('/api/pix', apiLimiter, pixRoutes);
app.use('/api/business', apiLimiter, businessRoutes);
app.use('/api/payment', apiLimiter, paymentRoutes);
app.use('/api/suggestions', apiLimiter, suggestionsRoutes);
app.use('/api/contracts', apiLimiter, contractsRoutes);
const financeRoutes = require('./routes/finance.routes');
app.use('/api/finance', apiLimiter, financeRoutes);
const agendaRoutes = require('./routes/agenda.routes');
app.use('/api/agenda', apiLimiter, agendaRoutes);
const bibleRoutes = require('./modules/bible/bible.routes');
const locationRoutes = require('./modules/location/location.routes');
app.use('/api/bible', apiLimiter, bibleRoutes);
app.use('/api/location', apiLimiter, locationRoutes);
const sitesRoutes = require('./modules/sites/sites.routes');
app.use('/api/sites', apiLimiter, sitesRoutes);
const orcamentosRoutes = require('./modules/orcamentos/orcamentos.routes');
app.use('/api/orcamentos', apiLimiter, orcamentosRoutes);
const documentosRoutes = require('./modules/documentos/documentos.routes');
app.use('/api/documentos', apiLimiter, documentosRoutes);
// IMPORTANTE: cadastroLinksRoutes deve vir ANTES de guestListRoutes para que rotas específicas como /:id/cadastro-links sejam processadas antes da rota genérica /:id
app.use('/api/guest-lists', apiLimiter, cadastroLinksRoutes);
app.use('/api/guest-lists', apiLimiter, guestListCustomizeRoutes);
app.use('/api/guest-lists', apiLimiter, guestListRoutes);
app.use('/guest-list', publicGuestListRoutes);
app.use('/portaria', publicGuestListRoutes.portaria);
app.use('/api/webhooks', checkoutWebhookRoutes); // POST /pagbank (módulo checkout)
app.use('/api/webhooks', apiLimiter, webhooksRoutes);
app.use('/api/checkout', apiLimiter, checkoutRoutes);
app.use('/api/push', apiLimiter, pushNotificationsRoutes);

// Histórico de confirmações (Melhoria 7)
const confirmationHistoryRoutes = require('./routes/confirmationHistory.routes');
app.use('/api/guest-lists', apiLimiter, confirmationHistoryRoutes);

// IMPORTANTE: Rotas públicas de agenda devem vir ANTES das rotas genéricas (/) para evitar interceptação
// Rotas específicas de API primeiro
const publicAgendaRoutes = require('./routes/publicAgenda.routes');
const oauthAgendaRoutes = require('./routes/oauthAgenda.routes');
// Registrar rotas de API primeiro (mais específicas)
app.use('/api/agenda', publicAgendaRoutes);
app.use('/api/oauth/agenda', oauthAgendaRoutes);
// Depois registrar rotas públicas genéricas
app.use('/agenda', publicAgendaRoutes);

// IMPORTANTE: Rotas públicas de contrato devem vir ANTES das rotas genéricas (/) para evitar interceptação
app.use('/contract', publicContractRoutes);
app.use('/vcard', vcardRoutes);

// Recuperar senha e resetar senha – PRIMEIRO para não serem capturadas por /:slug
const publicPasswordRoutes = require('./routes/publicPassword.routes');
app.use('/', publicPasswordRoutes);

// Rotas públicas legais (Política de Privacidade e Termos de Serviço)
const publicLegalRoutes = require('./routes/publicLegal.routes');
app.use('/', publicLegalRoutes);

// Rotas do módulo Sales Page
// IMPORTANTE: Rotas específicas (analytics) devem vir ANTES das rotas genéricas (/:id)
app.use('/api/v1/sales-pages', apiLimiter, analyticsRoutesSalesPage);
app.use('/api/v1/sales-pages', apiLimiter, productRoutes);
app.use('/api/v1/sales-pages', apiLimiter, salesPageRoutes);

// Middleware para redirecionar domínio cnking.bio para tag.conectaking.com.br
app.use((req, res, next) => {
    // Verificar se a requisição vem do domínio cnking.bio
    const host = req.get('host') || req.hostname;
    if (host && (host === 'cnking.bio' || host === 'www.cnking.bio')) {
        // Se for a raiz, redirecionar para tag.conectaking.com.br
        if (req.path === '/' || req.path === '') {
            return res.redirect(301, 'https://tag.conectaking.com.br/');
        }
        // Para qualquer caminho /:slug, redirecionar mantendo o slug
        const slug = req.path.replace(/^\//, ''); // Remove barra inicial
        if (slug) {
            const redirectUrl = `https://tag.conectaking.com.br/${slug}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
            return res.redirect(301, redirectUrl);
        }
    }
    next();
});

// Rota de redirecionamento cnking/:slug -> /:slug (fallback para formato no mesmo domínio)
// Deve vir ANTES de todas as outras rotas públicas
app.get('/cnking/:slug', (req, res) => {
    const { slug } = req.params;
    // Redirecionar para tag.conectaking.com.br/:slug
    const redirectUrl = `https://tag.conectaking.com.br/${slug}`;
    res.redirect(301, redirectUrl);
});

// Rota pública de formulário digital (DEVE vir ANTES de sales page e perfil)
// /form/:slug (ex: /form/lideresposicionados) seria capturado por /:slug/:storeSlug do sales page
const publicDigitalFormAnalyticsRoutes = require('./routes/publicDigitalFormAnalytics.routes');
const publicDigitalFormRoutes = require('./routes/publicDigitalForm.routes');
app.use('/', publicDigitalFormAnalyticsRoutes);
app.use('/', publicDigitalFormRoutes);

// Rota pública de página de vendas (deve vir ANTES de produto para evitar conflitos)
// Ela verifica se não é "produto" e passa para próxima rota se necessário
app.use('/', publicSalesPageRoutes);

// Rota pública de produto individual (deve vir antes de publicProfileRoutes)
const publicProductRoutes = require('./routes/publicProduct');
app.use('/', publicProductRoutes);

// Bíblia pública (/:slug/bible)
const publicBibleRoutes = require('./routes/publicBible.routes');
app.use('/', publicBibleRoutes);
// Meu site público (/:slug/site)
const publicSiteRoutes = require('./routes/publicSite.routes');
app.use('/', publicSiteRoutes);

// Perfis públicos (sem rate limiting)
app.use('/', publicProfileRoutes);

// Proxy de imagem para processar PNGs com fundo preto
app.use('/api/image', imageProxyRoutes);

// Rota para gerar imagem Open Graph (og-image.jpg) para preview no WhatsApp
app.use('/', ogImageRoutes);

cron.schedule('0 0 * * *', async () => {
    logger.info('Executando verificação diária de assinaturas e testes...');
    try {
        const trialResult = await db.query(
            `UPDATE users 
             SET account_type = 'free', subscription_status = 'expired_trial' 
             WHERE subscription_expires_at < NOW() AND subscription_status = 'pre_sale_trial'`
        );
        if (trialResult.rowCount > 0) {
            logger.info(`${trialResult.rowCount} teste(s) da pré-venda expirado(s) foram atualizados para 'free'.`);
        }

        const subscriptionResult = await db.query(
            `UPDATE users 
             SET account_type = 'free', subscription_status = 'expired' 
             WHERE subscription_expires_at < NOW() AND account_type = 'individual' AND subscription_status = 'active'`
        );
        if (subscriptionResult.rowCount > 0) {
            logger.info(`${subscriptionResult.rowCount} assinatura(s) paga(s) expirada(s) foram atualizadas para 'free'.`);
        }

    } catch (error) {
        logger.error('Erro ao verificar expirações', error);
    }
});

// Limpeza de dados expirados (diariamente às 2h)
const { runCleanup } = require('./utils/cleanup');
cron.schedule('0 2 * * *', async () => {
    logger.info('Executando limpeza de dados expirados...');
    try {
        await runCleanup();
    } catch (error) {
        logger.error('Erro na limpeza de dados expirados', error);
    }
});

// ============================================================
// Limpeza diária de imagens órfãs no Cloudflare Images (opcional)
//
// Por segurança, isso fica DESLIGADO por padrão.
//
// Para ligar em produção, configure env:
// - CF_ORPHAN_CLEANUP_ENABLED=1
// - CLOUDFLARE_ACCOUNT_ID (ou CF_IMAGES_ACCOUNT_ID)
// - (recomendado) CLOUDFLARE_API_TOKEN com permissão Cloudflare Images (Read + Edit)
//   ou CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY
// - DRY_RUN=0 e CONFIRM_DELETE=SIM (ou use variáveis CF_ORPHAN_* abaixo)
//
// Observação: o script em si tem um lock Postgres para evitar duplicidade.
// ============================================================
function isTruthy(v) {
    return ['1', 'true', 'yes', 'sim', 'on'].includes(String(v || '').trim().toLowerCase());
}

function scheduleCloudflareOrphanCleanup() {
    const enabled = isTruthy(process.env.CF_ORPHAN_CLEANUP_ENABLED);
    if (!enabled) return;

    const cronExpr = (process.env.CF_ORPHAN_CLEANUP_CRON || '30 5 * * *').toString().trim();
    // Render costuma rodar em UTC; 05:30 UTC ≈ 02:30 (Brasil) dependendo de horário de verão.

    if (!cron.validate(cronExpr)) {
        logger.error('CF_ORPHAN_CLEANUP_CRON inválido; desativando agendamento', { cronExpr });
        return;
    }

    cron.schedule(cronExpr, async () => {
        try {
            logger.info('🧹 Iniciando limpeza diária de imagens órfãs (Cloudflare)...');

            // Defaults seguros (você pode sobrescrever no env do servidor)
            const env = {
                ...process.env,
                // Evita rodar em DRY por engano quando você quer limpar automaticamente:
                DRY_RUN: (process.env.CF_ORPHAN_CLEANUP_DRY_RUN ?? process.env.DRY_RUN ?? '1').toString(),
                CONFIRM_DELETE: (process.env.CF_ORPHAN_CLEANUP_CONFIRM ?? process.env.CONFIRM_DELETE ?? '').toString(),
                MAX_DELETE: (process.env.CF_ORPHAN_CLEANUP_MAX_DELETE ?? process.env.MAX_DELETE ?? '50').toString(),
                SLEEP_MS: (process.env.CF_ORPHAN_CLEANUP_SLEEP_MS ?? process.env.SLEEP_MS ?? '200').toString(),
                OUT_FILE: (process.env.CF_ORPHAN_CLEANUP_OUT_FILE ?? process.env.OUT_FILE ?? '').toString(),
                MIN_AGE_DAYS: (process.env.CF_ORPHAN_CLEANUP_MIN_AGE_DAYS ?? process.env.MIN_AGE_DAYS ?? '0').toString(),
                // lock customizável (opcional)
                CF_ORPHAN_CLEANUP_LOCK_KEY: (process.env.CF_ORPHAN_CLEANUP_LOCK_KEY ?? '20260201').toString()
            };

            // Executa em processo separado para não travar o servidor
            const scriptPath = path.join(__dirname, 'scripts', 'cleanup-cloudflare-images.js');
            const child = spawn(process.execPath, [scriptPath], {
                env,
                stdio: 'inherit'
            });

            await new Promise((resolve, reject) => {
                child.on('error', reject);
                child.on('exit', (code) => {
                    if (code === 0) return resolve();
                    reject(new Error(`cleanup-cloudflare-images.js exit code=${code}`));
                });
            });

            logger.info('✅ Limpeza diária de órfãs (Cloudflare) finalizada.');
        } catch (error) {
            logger.error('❌ Erro na limpeza diária de órfãs (Cloudflare)', {
                message: error?.message || String(error),
                stack: error?.stack
            });
        }
    });

    logger.info('✅ Agendamento de limpeza de órfãs (Cloudflare) ativado', { cronExpr });
}

scheduleCloudflareOrphanCleanup();

function scheduleR2OrphanCleanup() {
    const enabled = isTruthy(process.env.R2_ORPHAN_CLEANUP_ENABLED);
    if (!enabled) return;

    const cronExpr = (process.env.R2_ORPHAN_CLEANUP_CRON || '45 5 * * *').toString().trim();
    if (!cron.validate(cronExpr)) {
        logger.error('R2_ORPHAN_CLEANUP_CRON inválido; desativando', { cronExpr });
        return;
    }

    cron.schedule(cronExpr, async () => {
        try {
            logger.info('🧹 Iniciando limpeza diária de órfãos R2 (KingSelection)...');
            const env = {
                ...process.env,
                DRY_RUN: (process.env.R2_ORPHAN_CLEANUP_DRY_RUN ?? process.env.DRY_RUN ?? '1').toString(),
                CONFIRM_DELETE: (process.env.R2_ORPHAN_CLEANUP_CONFIRM ?? process.env.CONFIRM_DELETE ?? 'SIM').toString(),
                MAX_DELETE: (process.env.R2_ORPHAN_CLEANUP_MAX_DELETE ?? process.env.MAX_DELETE ?? '100').toString(),
                SLEEP_MS: (process.env.R2_ORPHAN_CLEANUP_SLEEP_MS ?? process.env.SLEEP_MS ?? '200').toString(),
                R2_ORPHAN_CLEANUP_LOCK_KEY: (process.env.R2_ORPHAN_CLEANUP_LOCK_KEY ?? '20260202').toString()
            };
            const scriptPath = path.join(__dirname, 'scripts', 'cleanup-r2-orphans.js');
            const child = spawn(process.execPath, [scriptPath], { env, stdio: 'inherit' });
            await new Promise((resolve, reject) => {
                child.on('error', reject);
                child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`cleanup-r2-orphans.js exit=${code}`))));
            });
            logger.info('✅ Limpeza diária R2 finalizada.');
        } catch (error) {
            logger.error('❌ Erro na limpeza de órfãos R2', { message: error?.message || String(error) });
        }
    });

    logger.info('✅ Agendamento limpeza órfãos R2 ativado', { cronExpr });
}

scheduleR2OrphanCleanup();

// Middleware de tratamento de erros (deve ser o último)
app.use(notFoundHandler);
app.use(errorHandler);

// Executar migrations automaticamente antes de iniciar o servidor
async function startServer() {
    try {
        logger.info('🔄 Verificando e executando migrations pendentes...');
        await autoMigrate.runPendingMigrations();
        logger.info('✅ Migrations verificadas. Iniciando servidor...\n');
    } catch (error) {
        logger.error('❌ Erro ao executar migrations automáticas:', error);
        logger.warn('⚠️  Servidor será iniciado mesmo com erro nas migrations. Verifique manualmente.');
    }

    const PORT = config.port;
    app.listen(PORT, () => {
        logger.info(`👑 Servidor Conecta King rodando na porta ${PORT} (${config.nodeEnv})`);
    });
}

// Iniciar servidor
startServer();
