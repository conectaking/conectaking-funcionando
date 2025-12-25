require('dotenv').config();

/**
 * Configuração centralizada da aplicação
 * Valida variáveis de ambiente obrigatórias
 */

const requiredEnvVars = [
    'DB_USER',
    'DB_HOST',
    'DB_DATABASE',
    'DB_PASSWORD',
    'DB_PORT',
    'JWT_SECRET'
];

// Valida variáveis obrigatórias
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias faltando:', missingVars.join(', '));
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
    
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
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
            max: 300 // 300 requisições por janela (aumentado de 100)
        }
    },
    
    // Upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB em bytes
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
        publicProfile: process.env.PUBLIC_PROFILE_URL || 'https://tag.conectaking.com.br'
    },
    
    // Cache
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hora em segundos
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10)
    }
};

module.exports = config;

