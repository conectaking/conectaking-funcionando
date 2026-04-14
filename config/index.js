require('dotenv').config();

/**
 * Configuração centralizada da aplicação
 * Valida variáveis de ambiente obrigatórias
 */

// Se DATABASE_URL estiver definida, não exige DB_* (conexão por URL). Caso contrário exige DB_USER, DB_HOST, etc.
const hasDatabaseUrl = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
const requiredEnvVars = hasDatabaseUrl
    ? ['JWT_SECRET']
    : ['DB_USER', 'DB_HOST', 'DB_DATABASE', 'DB_PASSWORD', 'DB_PORT', 'JWT_SECRET'];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias faltando:', missingVars.join(', '));
    console.error('   No Render: Environment → verifique se todas estão definidas. Logs: aba Logs do serviço.');
    process.exit(1);
}

const config = {
    // Servidor
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    
    // Banco de dados
    db: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: {
            rejectUnauthorized: false
        },
        pool: {
            max: parseInt(process.env.DB_POOL_MAX || '20', 10),
            min: parseInt(process.env.DB_POOL_MIN || '5', 10),
            idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10)
        }
    },
    
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    },
    
    // CORS: com credentials: true o origin não pode ser '*'; devolver o Origin exato no preflight.
    cors: {
        origin: (function() {
            const envList = (process.env.CORS_ORIGIN || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            const allowed = new Set([
                'http://127.0.0.1:5500',
                'http://127.0.0.1:5000',
                'http://127.0.0.1:3000',
                'http://localhost:5500',
                'http://localhost:5000',
                'http://localhost:3000',
                'http://localhost',
                'https://conectaking.com.br',
                'https://www.conectaking.com.br',
                'https://tag.conectaking.com.br',
                'https://conectaking-api.onrender.com',
                ...envList
            ]);
            function isConectakingSiteOrigin(origin) {
                try {
                    const u = new URL(origin);
                    const host = u.hostname.toLowerCase();
                    return (
                        host === 'conectaking.com.br' ||
                        host === 'www.conectaking.com.br' ||
                        host.endsWith('.conectaking.com.br')
                    );
                } catch (e) {
                    return false;
                }
            }
            function isLocalDevOrigin(origin) {
                try {
                    const u = new URL(origin);
                    const h = u.hostname.toLowerCase();
                    return h === '127.0.0.1' || h === 'localhost';
                } catch (e) {
                    return false;
                }
            }
            return function corsOriginCallback(origin, callback) {
                if (!origin) return callback(null, true);
                if (allowed.has(origin)) return callback(null, origin);
                if (isConectakingSiteOrigin(origin)) return callback(null, origin);
                if (isLocalDevOrigin(origin)) return callback(null, origin);
                if (allowed.has('*')) return callback(null, origin);
                callback(null, false);
            };
        })(),
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'Origin',
            'X-Requested-With',
            'Cache-Control',
            'Pragma',
            'Expires',
            'X-King-Docs-Viewer',
            'X-King-Docs-Repeat-Visit'
        ],
        exposedHeaders: ['Content-Disposition', 'Retry-After'],
        optionsSuccessStatus: 204,
        maxAge: 86400
    },
    
    // Rate Limiting (aumentado para evitar problemas com usuários normais)
    rateLimit: {
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 50 // 50 requisições por janela (aumentado de 20)
        },
        upload: {
            windowMs: 60 * 60 * 1000, // 1 hora
            max: 100 // 100 uploads por hora (aumentado de 50)
        },
        api: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 600 // 600 requisições por janela (aumentado de 300 para reduzir rate limiting)
        },
        kingbrief: {
            windowMs: 60 * 60 * 1000, // 1 hora
            max: parseInt(process.env.KINGBRIEF_RATE_LIMIT_MAX || '200', 10) // 200 por hora (evita 429; ajustável via KINGBRIEF_RATE_LIMIT_MAX)
        },
        /** Tentativas de senha em links partilhados King Docs (anti brute-force no POST /public/:token/unlock) */
        kingDocsUnlock: {
            windowMs: parseInt(process.env.KING_DOCS_UNLOCK_WINDOW_MS || String(15 * 60 * 1000), 10),
            max: parseInt(process.env.KING_DOCS_UNLOCK_MAX || '12', 10)
        }
    },
    
    // Upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB em bytes (aumentado para permitir Bíblia completa e livros grandes)
        kingbriefMaxFileSize: parseInt(process.env.KINGBRIEF_MAX_FILE_SIZE || '209715200', 10), // 200MB para áudio KingBrief
        allowedMimeTypes: {
            image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            pdf: ['application/pdf']
        }
    },
    
    // Cloudflare Images (se usado)
    cloudflare: {
        accountHash: process.env.CLOUDFLARE_ACCOUNT_HASH || '',
        apiToken: process.env.CLOUDFLARE_API_TOKEN || ''
    },
    
    // MercadoPago (se usado)
    mercadopago: {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || ''
    },
    
    // URLs
    urls: {
        api: process.env.API_URL || 'https://conectaking-api.onrender.com',
        frontend: process.env.FRONTEND_URL || 'https://conectaking.com.br',
        publicProfile: process.env.PUBLIC_PROFILE_URL || 'https://tag.conectaking.com.br',
        // Link de compartilhamento KingSelection (ex.: https://www.conectaking.com.br)
        shareBase: process.env.KING_SELECTION_SHARE_BASE_URL || process.env.FRONTEND_URL || 'https://www.conectaking.com.br'
    },
    
    // Cache
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hora em segundos
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10)
    }
};

module.exports = config;

