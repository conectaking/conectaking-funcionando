const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const protectUser = (req, res, next) => {
    if (!config.jwt.secret) {
        logger.error('JWT_SECRET não configurado');
        return res.status(500).json({ 
            success: false,
            message: 'Erro de configuração interna do servidor.' 
        });
    }
    
    let token;
    let tokenSource = 'none';
    
    // Aceitar token via header Authorization (padrão)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        tokenSource = 'header';
    }
    // Aceitar token via query string (para páginas de personalização abertas em nova aba)
    else if (req.query.token) {
        token = req.query.token;
        tokenSource = 'query';
    }
    // Aceitar token via cookie (fallback)
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        tokenSource = 'cookie';
    }
    
    logger.debug('Verificando autenticação', {
        path: req.path,
        method: req.method,
        tokenSource: tokenSource,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
    });
    
    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            
            req.user = decoded; 
            logger.debug('Usuário autenticado', { 
                userId: decoded.userId, 
                email: decoded.email,
                tokenSource: tokenSource
            });
            
            next();
        } catch (error) {
            logger.warn('Token inválido ou expirado', { 
                error: error.message,
                errorName: error.name,
                ip: req.ip,
                path: req.path,
                method: req.method,
                tokenSource: tokenSource
            });
            return res.status(401).json({ 
                success: false,
                message: 'Não autorizado, token inválido ou expirado.' 
            });
        }
    } else {
        logger.warn('Tentativa de acesso sem token', { 
            ip: req.ip, 
            path: req.path,
            method: req.method,
            hasAuthHeader: !!req.headers.authorization,
            hasQueryToken: !!req.query.token,
            hasCookieToken: !!(req.cookies && req.cookies.token)
        });
        return res.status(401).json({ 
            success: false,
            message: 'Não autorizado, nenhum token encontrado.' 
        });
    }
};

module.exports = { protectUser };