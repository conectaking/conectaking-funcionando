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

        // Filtrar tentativas de acesso de bots/scanners
        const isWordPressAttempt = /wp-admin|wordpress|wp-content|wp-includes|wp-login|setup-config|xmlrpc\.php|readme\.html/i.test(req.path);
        const isCommonBotPath = /phpmyadmin|phpinfo|\.env|\.git|backup|test\.php|shell\.php|c99|r57|\.sql$|\.bak$|\.old$/i.test(req.path);
        const isGenericPath = /^\/index\.php$|^\/api$|^\/admin$/.test(req.path); // Rotas genéricas sem parâmetros
        
        // Não logar 404 de rotas conhecidas de bots ou rotas genéricas
        const shouldSkipLog = req.path === '/favicon.ico' || 
                             isWordPressAttempt || 
                             isCommonBotPath || 
                             (res.statusCode === 404 && isGenericPath);
        
        if (res.statusCode >= 400 && !shouldSkipLog) {
            // Log apenas erros reais, não tentativas de bots
            if (res.statusCode === 404) {
                // 404 apenas em debug para não poluir logs
                logger.debug('Requisição 404', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip
                });
            } else {
                // Outros erros (500, 400, etc) sempre logar
                logger.warn('Requisição com erro', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip
                });
            }
        }

        originalSend.call(this, body);
    };

    next();
};

module.exports = requestLogger;
