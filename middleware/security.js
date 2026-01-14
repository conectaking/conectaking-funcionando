/**
 * Middlewares de segurança adicionais
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Rate limiter mais restritivo para endpoints sensíveis
 */
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Apenas 5 tentativas
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
    message: 'Muitas tentativas. Tente novamente em 15 minutos.',
    handler: (req, res) => {
        logger.warn('Rate limit excedido', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'Muitas tentativas. Tente novamente em 15 minutos.'
        });
    }
});

/**
 * Rate limiter para recuperação de senha (muito restritivo)
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Apenas 3 tentativas por hora
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: 'Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.',
    handler: (req, res) => {
        logger.warn('Rate limit de recuperação de senha excedido', {
            ip: req.ip,
            email: req.body?.email
        });
        res.status(429).json({
            success: false,
            message: 'Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.'
        });
    }
});

/**
 * Middleware para adicionar headers de segurança
 */
const securityHeaders = (req, res, next) => {
    // X-Content-Type-Options previne MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options previne clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection (para browsers antigos)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions-Policy (antigo Feature-Policy)
    // Permitir câmera para o próprio domínio (necessário para QR Code scanner)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');
    
    next();
};

/**
 * Middleware para validar tamanho de requisição
 */
const validateRequestSize = (maxSize = 5 * 1024 * 1024) => { // 5MB padrão
    return (req, res, next) => {
        const contentLength = parseInt(req.get('content-length') || '0');
        
        if (contentLength > maxSize) {
            logger.warn('Requisição muito grande rejeitada', {
                size: contentLength,
                max: maxSize,
                path: req.path
            });
            return res.status(413).json({
                success: false,
                message: 'Requisição muito grande. Tamanho máximo: ' + (maxSize / 1024 / 1024) + 'MB'
            });
        }
        
        next();
    };
};

module.exports = {
    strictLimiter,
    passwordResetLimiter,
    securityHeaders,
    validateRequestSize
};

