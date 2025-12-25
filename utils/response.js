/**
 * Utilitários para respostas padronizadas da API
 * Facilita criação de respostas consistentes
 */

/**
 * Resposta de sucesso
 */
function success(res, data = null, message = 'Operação realizada com sucesso', statusCode = 200) {
    const response = {
        success: true,
        message
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
}

/**
 * Resposta de erro
 */
function error(res, message = 'Erro ao processar requisição', statusCode = 400, details = null) {
    const response = {
        success: false,
        message
    };

    if (details) {
        response.details = details;
    }

    return res.status(statusCode).json(response);
}

/**
 * Resposta de não encontrado
 */
function notFound(res, resource = 'Recurso') {
    return error(res, `${resource} não encontrado`, 404);
}

/**
 * Resposta de não autorizado
 */
function unauthorized(res, message = 'Não autorizado') {
    return error(res, message, 401);
}

/**
 * Resposta de proibido
 */
function forbidden(res, message = 'Acesso negado') {
    return error(res, message, 403);
}

/**
 * Resposta de erro do servidor
 */
function serverError(res, message = 'Erro interno do servidor', details = null) {
    return error(res, message, 500, details);
}

/**
 * Resposta de validação
 */
function validationError(res, errors) {
    return error(res, 'Dados inválidos', 400, errors);
}

/**
 * Resposta paginada
 */
function paginated(res, data, page, limit, total) {
    return success(res, {
        items: data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            pages: Math.ceil(total / limit)
        }
    });
}

module.exports = {
    success,
    error,
    notFound,
    unauthorized,
    forbidden,
    serverError,
    validationError,
    paginated
};

