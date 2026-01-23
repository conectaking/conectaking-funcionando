/**
 * Validadores de validação para rotas de autenticação
 * Usa express-validator
 */

const { body, validationResult } = require('express-validator');
const { emailValidator, passwordValidator, registrationCodeValidator } = require('./validators');

/**
 * Validadores para registro
 */
const validateRegistration = [
    emailValidator,
    passwordValidator(6),
    registrationCodeValidator
];

/**
 * Validadores para login
 */
const validateLogin = [
    emailValidator,
    body('password')
        .notEmpty()
        .withMessage('A senha é obrigatória.')
];

/**
 * Middleware para processar erros de validação
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array()
        });
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    handleValidationErrors
};
