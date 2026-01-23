/**
 * Validators para o módulo de Assinatura
 */

const { body, param, query, validationResult } = require('express-validator');

class SubscriptionValidators {
    /**
     * Validar billingType
     */
    validateBillingType() {
        return query('billingType')
            .optional()
            .isIn(['monthly', 'annual'])
            .withMessage('billingType deve ser "monthly" ou "annual"');
    }

    /**
     * Validar dados de atualização de plano
     */
    validateUpdatePlan() {
        return [
            param('id')
                .isInt({ min: 1 })
                .withMessage('ID do plano deve ser um número inteiro válido'),
            body('plan_name')
                .optional()
                .isString()
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('Nome do plano deve ter entre 1 e 100 caracteres'),
            body('price')
                .optional()
                .isFloat({ min: 0 })
                .withMessage('Preço deve ser um número positivo'),
            body('description')
                .optional()
                .isString()
                .trim()
                .withMessage('Descrição deve ser uma string'),
            body('features')
                .optional()
                .custom((value) => {
                    if (typeof value === 'object' || typeof value === 'string') {
                        return true;
                    }
                    throw new Error('Features deve ser um objeto JSON ou string JSON');
                }),
            body('whatsapp_number')
                .optional()
                .isString()
                .trim()
                .isLength({ max: 20 })
                .withMessage('Número do WhatsApp deve ter no máximo 20 caracteres'),
            body('whatsapp_message')
                .optional()
                .isString()
                .trim()
                .withMessage('Mensagem do WhatsApp deve ser uma string'),
            body('pix_key')
                .optional()
                .isString()
                .trim()
                .isLength({ max: 255 })
                .withMessage('Chave PIX deve ter no máximo 255 caracteres'),
            body('is_active')
                .optional()
                .isBoolean()
                .withMessage('is_active deve ser um booleano')
        ];
    }

    /**
     * Validar dados de criação de plano
     */
    validateCreatePlan() {
        return [
            body('plan_code')
                .notEmpty()
                .isString()
                .trim()
                .isLength({ min: 1, max: 50 })
                .matches(/^[a-z0-9_]+$/)
                .withMessage('Código do plano deve conter apenas letras minúsculas, números e underscore'),
            body('plan_name')
                .notEmpty()
                .isString()
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('Nome do plano é obrigatório e deve ter entre 1 e 100 caracteres'),
            body('price')
                .notEmpty()
                .isFloat({ min: 0 })
                .withMessage('Preço é obrigatório e deve ser um número positivo'),
            body('description')
                .optional()
                .isString()
                .trim()
                .withMessage('Descrição deve ser uma string'),
            body('features')
                .optional()
                .custom((value) => {
                    if (typeof value === 'object' || typeof value === 'string') {
                        return true;
                    }
                    throw new Error('Features deve ser um objeto JSON ou string JSON');
                }),
            body('whatsapp_number')
                .optional()
                .isString()
                .trim()
                .isLength({ max: 20 })
                .withMessage('Número do WhatsApp deve ter no máximo 20 caracteres'),
            body('whatsapp_message')
                .optional()
                .isString()
                .trim()
                .withMessage('Mensagem do WhatsApp deve ser uma string'),
            body('pix_key')
                .optional()
                .isString()
                .trim()
                .isLength({ max: 255 })
                .withMessage('Chave PIX deve ter no máximo 255 caracteres'),
            body('is_active')
                .optional()
                .isBoolean()
                .withMessage('is_active deve ser um booleano')
        ];
    }

    /**
     * Middleware para verificar erros de validação
     */
    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Erro de validação',
                errors: errors.array()
            });
        }
        next();
    }
}

module.exports = new SubscriptionValidators();
