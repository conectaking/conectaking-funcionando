/**
 * Middleware centralizado de tratamento de erros
 * Captura todos os erros e retorna respostas padronizadas
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Middleware para capturar erros assíncronos
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware principal de tratamento de erros
 * Deve ser o último middleware na cadeia
 */
const errorHandler = (err, req, res, next) => {
    // Log do erro com mais detalhes, especialmente para erros de template EJS
    logger.error('Erro na requisição', {
        method: req.method,
        path: req.path,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            path: err.path,
            line: err.line,
            column: err.column
        }
    });
    
    // Log adicional para erros de template EJS
    if (err.path && err.path.includes('.ejs')) {
        logger.error('Erro no template EJS', {
            template: err.path,
            line: err.line,
            column: err.column,
            message: err.message,
            originalError: err.originalError ? err.originalError.message : null
        });
    }

    // Erros de validação
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Dados inválidos',
            ...(config.isProduction ? {} : { details: err.message })
        });
    }

    // Erros de autenticação/autorização
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({
            success: false,
            message: 'Não autorizado'
        });
    }

    // Erros de não encontrado
    if (err.status === 404) {
        return res.status(404).json({
            success: false,
            message: 'Recurso não encontrado'
        });
    }

    // Erros do banco de dados
    if (err.code && err.code.startsWith('23')) {
        return res.status(400).json({
            success: false,
            message: 'Violação de restrição do banco de dados',
            ...(config.isProduction ? {} : { details: err.message })
        });
    }

    // Erro genérico do servidor
    res.status(err.status || 500).json({
        success: false,
        message: config.isProduction 
            ? 'Erro interno do servidor' 
            : err.message,
        ...(config.isProduction ? {} : { stack: err.stack })
    });
};

/**
 * Middleware para rotas não encontradas
 */
const notFoundHandler = (req, res) => {
    const path = req.path.toLowerCase();
    
    // Lista de rotas comuns de bots que não devem ser logadas
    const commonBotPaths = [
        '/index.php', '/api', '/admin', '/wp-admin', '/wordpress',
        '/phpmyadmin', '/.env', '/.git', '/backup', '/test.php',
        '/wp-login', '/setup-config', '/xmlrpc', '/readme.html'
    ];
    
    const isBotPath = commonBotPaths.some(pattern => path.includes(pattern));
    
    // Não logar 404 de rotas conhecidas de bots (reduz ruído nos logs)
    if (!isBotPath) {
        logger.warn('Rota não encontrada', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent')?.substring(0, 100)
        });
    }
    
    res.status(404).json({
        success: false,
        message: `Rota ${req.method} ${req.path} não encontrada`
    });
};

/**
 * Erros customizados
 */
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
    }
}

class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnauthorizedError';
        this.status = 401;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.status = 404;
    }
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    ValidationError,
    UnauthorizedError,
    NotFoundError
};
