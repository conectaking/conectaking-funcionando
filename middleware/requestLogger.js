/**
 * Middleware de logging de requisições
 * Registra todas as requisições HTTP para análise
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Middleware para logar requisições
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    // Intercepta o envio da resposta para calcular tempo
    res.send = function(body) {
        const duration = Date.now() - startTime;
        
        // Log apenas em desenvolvimento ou para rotas importantes
        if (!config.isProduction || req.path.startsWith('/api/')) {
            logger.info('Requisição HTTP', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent')?.substring(0, 50)
            });
        }

        // Log de erros sempre
        if (res.statusCode >= 400) {
            logger.warn('Requisição com erro', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });
        }

        originalSend.call(this, body);
    };

    next();
};

module.exports = requestLogger;
