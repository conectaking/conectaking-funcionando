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
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiry');
const generatorRoutes = require('./routes/generator');
const accountRoutes = require('./routes/account');
const profileRoutes = require('./routes/profile');
const publicProfileRoutes = require('./routes/publicProfile');
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
const productsRoutes = require('./routes/products');
const imageProxyRoutes = require('./routes/imageProxy');
const requestLogger = require('./middleware/requestLogger');
const { securityHeaders, validateRequestSize } = require('./middleware/security');

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
                "https://sdk.mercadopago.com",
                "https://www.youtube.com",
                "https://www.youtube.com/iframe_api",
                "https://www.googletagmanager.com",
                "blob:"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdnjs.cloudflare.com", 
                "https://fonts.googleapis.com"
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
                "https://stats.g.doubleclick.net"
            ],
            fontSrc: [
                "'self'", 
                "https://fonts.gstatic.com", 
                "https://cdnjs.cloudflare.com" 
            ],
            frameSrc: [
                "'self'", 
                "https://www.instagram.com", 
                "https://www.youtube.com",
                "https://*.youtube.com",
                "https://*.googlevideo.com"
            ],
            connectSrc: [
                "'self'",
                "https://conectaking-api.onrender.com",
                "https://bio.conectaking.com.br",
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
                "https://www.google.com"
            ],
            mediaSrc: [
                "'self'",
                "https://*.youtube.com",
                "https://*.googlevideo.com"
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
const authLimiter = rateLimit({
    windowMs: config.rateLimit.auth.windowMs,
    max: config.rateLimit.auth.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: 'Muitas tentativas de login/registro. Tente novamente em 15 minutos.'
});

const uploadLimiter = rateLimit({
    windowMs: config.rateLimit.upload.windowMs,
    max: config.rateLimit.upload.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: 'Muitos uploads realizados. Tente novamente mais tarde.'
});

const apiLimiter = rateLimit({
    windowMs: config.rateLimit.api.windowMs,
    max: config.rateLimit.api.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
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

// Health check (sem rate limit)
app.use('/api', healthRoutes);

// Rotas de recuperação de senha
app.use('/api/password', passwordRoutes);

// Rotas da API com rate limiting apropriado
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/inquiry', apiLimiter, inquiryRoutes);
app.use('/api/generator', apiLimiter, generatorRoutes);
app.use('/api/account', apiLimiter, accountRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);
app.use('/log', loggerRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/upload/pdf', uploadLimiter, pdfUploadRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/download', downloadRoutes);
app.use('/api/pix', apiLimiter, pixRoutes);
app.use('/api/business', apiLimiter, businessRoutes);
app.use('/api/payment', apiLimiter, paymentRoutes);
app.use('/api/profile', apiLimiter, productsRoutes);
app.use('/vcard', vcardRoutes);

// Rota pública de produto individual (deve vir antes de publicProfileRoutes)
const publicProductRoutes = require('./routes/publicProduct');
app.use('/', publicProductRoutes);

// Perfis públicos (sem rate limiting)
app.use('/', publicProfileRoutes);

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

const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`👑 Servidor Conecta King rodando na porta ${PORT} (${config.nodeEnv})`);
});
