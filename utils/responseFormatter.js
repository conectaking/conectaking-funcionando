/**
 * Formata respostas da API de forma padronizada
 */

/**
 * Resposta de sucesso
 */
function success(res, data = null, message = null, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        error: null,
        ...(message && { message })
    });
}

/**
 * Resposta de erro
 */
function error(res, message, statusCode = 400, code = null, details = null) {
    return res.status(statusCode).json({
        success: false,
        data: null,
        error: {
            code: code || 'ERROR',
            message,
            ...(details && { details })
        }
    });
}

module.exports = {
    success,
    error
};

