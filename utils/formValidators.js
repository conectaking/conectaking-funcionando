/**
 * Validadores específicos para formulários King Forms
 * Validação robusta no backend para segurança
 */

const { body, validationResult } = require('express-validator');

/**
 * Sanitiza string removendo HTML e scripts
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
}

/**
 * Valida email de forma robusta
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida telefone/WhatsApp brasileiro
 */
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Aceita 10 ou 11 dígitos (com ou sem DDD)
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

/**
 * Valida CPF brasileiro
 */
function isValidCPF(cpf) {
    if (!cpf || typeof cpf !== 'string') return false;
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Validar dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
}

/**
 * Validação para submissão de formulário
 */
const validateFormSubmission = [
    body('response_data')
        .isObject()
        .withMessage('response_data deve ser um objeto')
        .notEmpty()
        .withMessage('response_data não pode estar vazio'),
    
    body('responder_name')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            // Se não existe ou é null/undefined, permitir
            if (!value || value === null || value === undefined) {
                return true;
            }
            // Se existe, deve ser string válida
            if (typeof value !== 'string') {
                throw new Error('Nome deve ser uma string');
            }
            const trimmed = value.trim();
            if (trimmed.length < 2 || trimmed.length > 200) {
                throw new Error('Nome deve ter entre 2 e 200 caracteres');
            }
            return true;
        })
        .customSanitizer((value) => {
            if (!value || value === null || value === undefined) {
                return null;
            }
            return sanitizeString(value);
        }),
    
    body('responder_email')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            // Se não existe ou é null/undefined, permitir
            if (!value || value === null || value === undefined) {
                return true;
            }
            // Se existe, deve ser email válido
            if (typeof value !== 'string') {
                throw new Error('Email deve ser uma string');
            }
            const trimmed = value.trim();
            if (trimmed && !isValidEmail(trimmed)) {
                throw new Error('Email inválido');
            }
            return true;
        }),
    
    body('responder_phone')
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            // Se não existe ou é null/undefined, permitir
            if (!value || value === null || value === undefined) {
                return true;
            }
            // Se existe, deve ser telefone válido
            if (typeof value !== 'string') {
                throw new Error('Telefone deve ser uma string');
            }
            const trimmed = value.trim();
            if (trimmed && !isValidPhone(trimmed)) {
                throw new Error('Telefone inválido');
            }
            return true;
        }),
    
    body('session_id')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('session_id inválido')
];

/**
 * Middleware para processar erros de validação
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dados inválidos',
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg
            }))
        });
    }
    next();
}

/**
 * Sanitiza objeto de resposta do formulário
 */
function sanitizeResponseData(responseData) {
    if (!responseData || typeof responseData !== 'object') {
        return {};
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(responseData)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? sanitizeString(item) : item
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeResponseData(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

module.exports = {
    validateFormSubmission,
    handleValidationErrors,
    sanitizeString,
    sanitizeResponseData,
    isValidEmail,
    isValidPhone,
    isValidCPF
};
