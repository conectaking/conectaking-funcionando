/**
 * Rotas para recuperação de senha
 */

const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { emailValidator } = require('../utils/validators');
const { handleValidationErrors } = require('../utils/validation');
const { 
    generatePasswordResetToken, 
    savePasswordResetToken, 
    validatePasswordResetToken,
    removePasswordResetToken,
    hashPassword,
    validatePasswordStrength
} = require('../utils/password');
const { sendPasswordResetEmail } = require('../utils/email');
const { success, error, validationError } = require('../utils/response');
const { passwordResetLimiter } = require('../middleware/security');
const { emailLocalPartWithoutDots } = require('../utils/emailHelpers');

const router = express.Router();

/**
 * Solicitar recuperação de senha
 */
router.post(
    '/forgot',
    passwordResetLimiter, // Rate limiting mais restritivo
    emailValidator,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email } = req.body;

        // Buscar usuário. Contas antigas podem ter email sem pontos na parte local.
        let userResult = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            const alt = emailLocalPartWithoutDots(email);
            if (alt !== email) {
                userResult = await db.query('SELECT id, email FROM users WHERE email = $1', [alt]);
            }
        }
        
        // Sempre retorna sucesso (por segurança, não revela se email existe)
        if (userResult.rows.length === 0) {
            logger.warn('Tentativa de recuperação com email não encontrado', { email });
            return success(res, null, 'Se o email existir, você receberá instruções para recuperar sua senha.');
        }

        const user = userResult.rows[0];

        // Gerar token
        const token = generatePasswordResetToken();
        await savePasswordResetToken(user.id, token);

        // Enviar email
        await sendPasswordResetEmail(user.email, token);

        logger.info('Email de recuperação de senha enviado', { userId: user.id });

        return success(res, null, 'Se o email existir, você receberá instruções para recuperar sua senha.');
    })
);

/**
 * Resetar senha com token
 */
router.post(
    '/reset',
    [
        body('token').notEmpty().withMessage('Token é obrigatório'),
        body('password').notEmpty().withMessage('Nova senha é obrigatória')
    ],
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { token, password } = req.body;

        // Validar força da senha
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return validationError(res, passwordValidation.errors);
        }

        // Validar token
        const userId = await validatePasswordResetToken(token);
        if (!userId) {
            return error(res, 'Token inválido ou expirado', 400);
        }

        // Hash da nova senha
        const passwordHash = await hashPassword(password);

        // Atualizar senha
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

        // Remover token usado
        await removePasswordResetToken(token);

        logger.info('Senha resetada com sucesso', { userId });

        return success(res, null, 'Senha alterada com sucesso!');
    })
);

module.exports = router;

