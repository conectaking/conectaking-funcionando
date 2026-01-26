require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path'); 
const cron = require('node-cron');
const db = require('./db');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiry');
const generatorRoutes = require('./routes/generator');
const accountRoutes = require('./routes/account');
const profileRoutes = require('./routes/profile');
const publicProfileRoutes = require('./routes/publicProfile');
const subscriptionRoutes = require('./routes/subscription');
const moduleAvailabilityRoutes = require('./routes/moduleAvailability');
const loggerRoutes = require('./routes/logger');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const pdfUploadRoutes = require('./routes/pdf-upload');
const downloadRoutes = require('./routes/download');
const pixRoutes = require('./routes/pix');
const businessRoutes = require('./routes/business');
const paymentRoutes = require('./routes/payment');
const vcardRoutes = require('./routes/vcard');
const healthRoutes = require('./routes/health');
const passwordRoutes = require('./routes/password');
const imageProxyRoutes = require('./routes/imageProxy');
const ogImageRoutes = require('./routes/ogImage');
const publicSalesPageRoutes = require('./routes/publicSalesPage.routes');
const salesPageRoutes = require('./modules/salesPage/salesPage.routes');
const productRoutes = require('./modules/salesPage/products/product.routes');
const analyticsRoutesSalesPage = require('./modules/salesPage/analytics/analytics.routes');
const suggestionsRoutes = require('./routes/suggestions');
const iaKingRoutes = require('./routes/iaKing');
const iaKingTrainingRoutes = require('./routes/iaKingTraining');
const aiCoreRoutes = require('./routes/aiCore');
const contractsRoutes = require('./modules/contracts/contract.routes');
const guestListRoutes = require('./routes/guestList.routes');
const publicGuestListRoutes = require('./routes/publicGuestList.routes');
const cadastroLinksRoutes = require('./routes/cadastroLinks.routes');
const guestListCustomizeRoutes = require('./routes/guestListCustomize.routes');
const publicContractRoutes = require('./routes/publicContract.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const pushNotificationsRoutes = require('./routes/pushNotifications.routes');
const checkinRoutes = require('./routes/checkin.routes');
const requestLogger = require('./middleware/requestLogger');
const { securityHeaders, validateRequestSize, botLimiter } = require('./middleware/security');
const autoMigrate = require('./utils/auto-migrate');

const app = express();

// Configurar trust proxy para funcionar corretamente atrás do proxy do Render
app.set('trust proxy', true);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'",
                "'unsafe-eval'",    
                "https://cdn.jsdelivr.net",
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
                "https://i.ibb.co", 
                "https://i.pravatar.cc", 
                "https://avatar.iran.liara.run",
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
                "https://*.google.com"
            ],
            connectSrc: [
                "'self'",
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
                "https://*.googlevideo.com"
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
    }
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
app.use(cors(config.cors));
app.use(securityHeaders); // Headers de segurança
app.use(validateRequestSize(config.upload.maxFileSize)); // Valida tamanho de requisição
app.use(express.json({ limit: `${config.upload.maxFileSize / 1024 / 1024}mb` }));
app.use(requestLogger); 

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

// Rota específica para favicon.ico (evitar 404)
app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    res.sendFile(faviconPath, (err) => {
        if (err) {
            // Se não existir, retornar 204 (No Content) em vez de 404
            res.status(204).end();
        }
    });
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// Rota raiz para health checks de serviços de monitoramento (Render, etc.)
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'Conecta King API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Servidor Conecta King está funcionando corretamente'
    });
});

// Bloquear bots e scanners - ANTES de qualquer rota e ANTES do requestLogger
// Isso evita que requisições de bots sejam processadas ou logadas
app.use((req, res, next) => {
    const path = req.path.toLowerCase();
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

// Health check (sem rate limit)
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
        path.startsWith('/api/ia-king') ||
        path.startsWith('/api/suggestions') ||
        path.startsWith('/api/log') ||
        path.startsWith('/api/vcard') ||
        path.startsWith('/api/public')
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

app.get('/api/modules/plan-availability-public', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Usar a mesma lógica do router moduleAvailability.js
        const availabilityQuery = `
            SELECT 
                mpa.id,
                mpa.module_type,
                mpa.plan_code,
                mpa.is_available,
                mpa.updated_at
            FROM module_plan_availability mpa
            WHERE mpa.module_type IN (
                'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode',
                'facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 
                'spotify', 'linkedin', 'pinterest',
                'link', 'portfolio', 'banner', 'carousel', 
                'youtube_embed', 'sales_page', 'digital_form',
                'finance', 'agenda', 'contract'
            )
            ORDER BY mpa.module_type, mpa.plan_code
        `;
        const availabilityResult = await client.query(availabilityQuery);
        
        // Organizar por módulo (mesma estrutura do router)
        const modulesMap = {};
        availabilityResult.rows.forEach(row => {
            if (!modulesMap[row.module_type]) {
                modulesMap[row.module_type] = {
                    module_type: row.module_type,
                    plans: {}
                };
            }
            modulesMap[row.module_type].plans[row.plan_code] = {
                is_available: row.is_available,
                id: row.id
            };
        });
        
        res.json({
            success: true,
            modules: Object.values(modulesMap)
        });
    } catch (error) {
        logger.error('❌ Erro ao buscar módulos públicos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar módulos',
            modules: []
        });
    } finally {
        client.release();
    }
}));

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
app.use('/log', loggerRoutes);
// Endpoint agregado de check-in (rate limit específico - 120/min)
app.use('/api/checkin', checkinLimiter, checkinRoutes);

app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/admin', adminLimiter, ogImageRoutes); // Rotas de personalização de link (apenas ADM)
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/upload/pdf', uploadLimiter, pdfUploadRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/download', downloadRoutes);
app.use('/api/pix', apiLimiter, pixRoutes);
app.use('/api/business', apiLimiter, businessRoutes);
app.use('/api/payment', apiLimiter, paymentRoutes);
app.use('/api/suggestions', apiLimiter, suggestionsRoutes);
// Rota pública do chat (sem rate limit para página inicial)
app.post('/api/ia-king/chat-public', (req, res, next) => {
    // Passar para o router sem rate limit
    iaKingRoutes(req, res, next);
});
// Rotas protegidas com rate limit
app.use('/api/ia-king', apiLimiter, iaKingRoutes);
app.use('/api/ia-king', apiLimiter, iaKingTrainingRoutes);
app.use('/api/ai-core', apiLimiter, aiCoreRoutes); // Nova ConectaKing AI Core
app.use('/api/contracts', apiLimiter, contractsRoutes);
const financeRoutes = require('./routes/finance.routes');
app.use('/api/finance', apiLimiter, financeRoutes);
const agendaRoutes = require('./routes/agenda.routes');
app.use('/api/agenda', apiLimiter, agendaRoutes);
// IMPORTANTE: cadastroLinksRoutes deve vir ANTES de guestListRoutes para que rotas específicas como /:id/cadastro-links sejam processadas antes da rota genérica /:id
app.use('/api/guest-lists', apiLimiter, cadastroLinksRoutes);
app.use('/api/guest-lists', apiLimiter, guestListCustomizeRoutes);
app.use('/api/guest-lists', apiLimiter, guestListRoutes);
app.use('/guest-list', publicGuestListRoutes);
app.use('/portaria', publicGuestListRoutes.portaria);
app.use('/api/webhooks', apiLimiter, webhooksRoutes);
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

// IMPORTANTE: Rotas públicas legais (Política de Privacidade e Termos de Serviço)
// DEVEM vir ANTES de todas as rotas genéricas (/) para evitar interceptação
const publicLegalRoutes = require('./routes/publicLegal.routes');
app.use('/', publicLegalRoutes);

// Recuperar senha e resetar senha (páginas EJS)
const publicPasswordRoutes = require('./routes/publicPassword.routes');
app.use('/', publicPasswordRoutes);

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
