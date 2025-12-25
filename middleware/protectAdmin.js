const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const protectAdmin = (req, res, next) => {
    if (!config.jwt.secret) {
        logger.error('JWT_SECRET não configurado');
        return res.status(500).json({ 
            success: false,
            message: 'Erro de configuração interna do servidor.' 
        });
    }

    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, config.jwt.secret);

            if (decoded && decoded.isAdmin) {
                req.user = decoded;
                logger.debug('Admin autenticado', { userId: decoded.userId, email: decoded.email });
                next(); 
            } else {
                logger.warn('Tentativa de acesso admin sem permissões', { 
                    userId: decoded?.userId,
                    ip: req.ip,
                    path: req.path
                });
                return res.status(403).json({ 
                    success: false,
                    message: 'Acesso negado. Permissões insuficientes.' 
                });
            }
        } catch (error) {
            logger.warn('Token admin inválido', { 
                error: error.message,
                ip: req.ip 
            });
            return res.status(401).json({ 
                success: false,
                message: 'Não autorizado, token inválido.' 
            });
        }
    }

    if (!token) {
        logger.warn('Tentativa de acesso admin sem token', { ip: req.ip, path: req.path });
        return res.status(401).json({ 
            success: false,
            message: 'Não autorizado, nenhum token encontrado.' 
        });
    }
};

module.exports = { protectAdmin };