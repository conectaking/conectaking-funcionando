// Utilitário de Auditoria de Ações (Melhoria 16)
const db = require('../db');
const logger = require('./logger');

/**
 * Registra uma ação no sistema de auditoria
 * @param {Object} options - Opções da auditoria
 * @param {number} options.userId - ID do usuário
 * @param {string} options.actionType - Tipo da ação (create, update, delete, view, export, etc)
 * @param {string} options.resourceType - Tipo do recurso (form, guest, response, list, etc)
 * @param {number} options.resourceId - ID do recurso
 * @param {string} options.resourceSlug - Slug do recurso (opcional)
 * @param {Object} options.details - Detalhes adicionais em JSON
 * @param {Object} options.req - Request object (para IP, user agent, etc)
 * @param {number} options.statusCode - Status code da resposta
 * @param {string} options.errorMessage - Mensagem de erro (se houver)
 * @param {number} options.executionTimeMs - Tempo de execução em milissegundos
 */
async function logAuditAction(options) {
    const {
        userId,
        actionType,
        resourceType,
        resourceId,
        resourceSlug,
        details = {},
        req = null,
        statusCode = null,
        errorMessage = null,
        executionTimeMs = null
    } = options;

    try {
        const client = await db.pool.connect();
        
        try {
            const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
            const userAgent = req?.headers?.['user-agent'] || null;
            const requestMethod = req?.method || null;
            const requestPath = req?.path || req?.url || null;

            await client.query(`
                INSERT INTO audit_logs (
                    user_id, action_type, resource_type, resource_id, resource_slug,
                    details, ip_address, user_agent, request_method, request_path,
                    status_code, error_message, execution_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                userId || null,
                actionType,
                resourceType,
                resourceId || null,
                resourceSlug || null,
                JSON.stringify(details),
                ipAddress,
                userAgent,
                requestMethod,
                requestPath,
                statusCode,
                errorMessage,
                executionTimeMs
            ]);
        } finally {
            client.release();
        }
    } catch (error) {
        // Não queremos que falhas na auditoria quebrem o sistema
        logger.error('Erro ao registrar auditoria:', error);
    }
}

/**
 * Middleware de auditoria (pode ser usado em rotas)
 */
function auditMiddleware(actionType, resourceType) {
    return async (req, res, next) => {
        const startTime = Date.now();
        
        // Sobrescrever res.json para capturar a resposta
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            const executionTime = Date.now() - startTime;
            
            // Log assíncrono (não bloqueia a resposta)
            logAuditAction({
                userId: req.user?.userId || null,
                actionType,
                resourceType,
                resourceId: req.params?.id || req.params?.itemId || null,
                resourceSlug: req.params?.slug || null,
                details: {
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    body: req.method !== 'GET' ? sanitizeBody(req.body) : null
                },
                req,
                statusCode: res.statusCode,
                errorMessage: data?.error || data?.message || null,
                executionTimeMs: executionTime
            }).catch(err => logger.error('Erro ao registrar auditoria:', err));
            
            return originalJson(data);
        };
        
        next();
    };
}

/**
 * Remove dados sensíveis do body antes de logar
 */
function sanitizeBody(body) {
    if (!body) return null;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'auth', 'key', 'apiKey'];
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    });
    
    return sanitized;
}

module.exports = {
    logAuditAction,
    auditMiddleware,
    sanitizeBody
};
