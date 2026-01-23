/**
 * Utilitários de segurança
 * Funções auxiliares para segurança e validação
 */

/**
 * Sanitiza string removendo caracteres perigosos
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < e >
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Valida se string contém apenas caracteres seguros para slugs
 */
function isValidSlug(slug) {
    if (!slug || typeof slug !== 'string') {
        return false;
    }
    
    // Apenas letras minúsculas, números, hífens e underscores
    return /^[a-z0-9_-]+$/.test(slug);
}

/**
 * Valida formato de email
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida formato de URL
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        // Aceita apenas http e https
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Previne NoSQL Injection
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Remove chaves que começam com $ (MongoDB operators)
        if (typeof key === 'string' && key.startsWith('$')) {
            continue;
        }
        
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Gera string aleatória segura
 */
function generateSecureRandom(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Valida origem de requisição (CORS)
 */
function isValidOrigin(origin, allowedOrigins) {
    if (!origin) {
        return false;
    }
    
    if (allowedOrigins === '*' || allowedOrigins.includes('*')) {
        return true;
    }
    
    return allowedOrigins.includes(origin);
}

/**
 * Rate limiting helper - verifica se IP está em whitelist
 */
function isWhitelisted(ip, whitelist = []) {
    return whitelist.includes(ip) || whitelist.includes('*');
}

module.exports = {
    sanitizeInput,
    isValidSlug,
    isValidEmail,
    isValidUrl,
    sanitizeObject,
    generateSecureRandom,
    isValidOrigin,
    isWhitelisted
};

