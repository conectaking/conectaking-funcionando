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

        // Log de erros sempre (exceto favicon.ico e tentativas de WordPress que são normais)
        // Filtrar tentativas de acesso ao WordPress (bots/scanners)
        const isWordPressAttempt = /wp-admin|wordpress|wp-content|wp-includes|wp-login|setup-config|xmlrpc\.php|readme\.html/i.test(req.path);
        const isCommonBotPath = /phpmyadmin|phpinfo|admin|\.env|\.git|backup|test|api\/v1\/|\.sql$/i.test(req.path);
        
        if (res.statusCode >= 400 && req.path !== '/favicon.ico' && !isWordPressAttempt && !isCommonBotPath) {
            logger.warn('Requisição com erro', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });
        } else if (res.statusCode === 404 && (isWordPressAttempt || isCommonBotPath)) {
            // Log apenas em nível debug para tentativas conhecidas de bots
            logger.debug('Tentativa de acesso bloqueada (bot/scanner)', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('user-agent')?.substring(0, 100)
            });
        }

        originalSend.call(this, body);
    };

    next();
};

module.exports = requestLogger;
