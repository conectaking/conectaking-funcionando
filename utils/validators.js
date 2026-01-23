/**
 * Validadores reutilizáveis para express-validator
 */

const { body, param, query } = require('express-validator');

/**
 * Validação de email
 */
const emailValidator = body('email')
    .isEmail()
    .withMessage('Por favor, forneça um e-mail válido.')
    .normalizeEmail();

/**
 * Validação de senha
 */
const passwordValidator = (minLength = 6) => 
    body('password')
        .isLength({ min: minLength })
        .withMessage(`A senha precisa ter no mínimo ${minLength} caracteres.`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número.');

/**
 * Validação de código de registro
 */
const registrationCodeValidator = body('registrationCode')
    .notEmpty()
    .withMessage('O código de registro é obrigatório.')
    .trim()
    .escape()
    .isLength({ min: 3, max: 50 })
    .withMessage('O código de registro deve ter entre 3 e 50 caracteres.');

/**
 * Validação de nome
 */
const nameValidator = body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('O nome deve ter entre 2 e 100 caracteres.')
    .escape();

/**
 * Validação de display name
 */
const displayNameValidator = body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('O nome de exibição deve ter entre 1 e 100 caracteres.')
    .escape();

/**
 * Validação de slug
 */
const slugValidator = param('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('O slug deve conter apenas letras minúsculas, números e hífens.');

/**
 * Validação de ID (UUID ou string)
 */
const idValidator = param('id')
    .notEmpty()
    .withMessage('ID é obrigatório.')
    .trim();

/**
 * Validação de URL
 */
const urlValidator = (field = 'url') =>
    body(field)
        .optional()
        .isURL()
        .withMessage('Por favor, forneça uma URL válida.');

/**
 * Validação de cor hexadecimal
 */
const hexColorValidator = (field = 'color') =>
    body(field)
        .optional()
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .withMessage('Por favor, forneça uma cor hexadecimal válida.');

/**
 * Validação de número inteiro
 */
const integerValidator = (field, min = null, max = null) => {
    let validator = body(field)
        .optional()
        .isInt()
        .withMessage('Deve ser um número inteiro.');
    
    if (min !== null) {
        validator = validator.isInt({ min }).withMessage(`Deve ser no mínimo ${min}.`);
    }
    
    if (max !== null) {
        validator = validator.isInt({ max }).withMessage(`Deve ser no máximo ${max}.`);
    }
    
    return validator;
};

/**
 * Validação de número decimal
 */
const floatValidator = (field, min = null, max = null) => {
    let validator = body(field)
        .optional()
        .isFloat()
        .withMessage('Deve ser um número decimal.');
    
    if (min !== null) {
        validator = validator.isFloat({ min }).withMessage(`Deve ser no mínimo ${min}.`);
    }
    
    if (max !== null) {
        validator = validator.isFloat({ max }).withMessage(`Deve ser no máximo ${max}.`);
    }
    
    return validator;
};

module.exports = {
    emailValidator,
    passwordValidator,
    registrationCodeValidator,
    nameValidator,
    displayNameValidator,
    slugValidator,
    idValidator,
    urlValidator,
    hexColorValidator,
    integerValidator,
    floatValidator
};

