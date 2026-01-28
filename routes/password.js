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
const { success, error } = require('../utils/response');
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

        const token = generatePasswordResetToken();
        await savePasswordResetToken(user.id, token);

        const sendResult = await sendPasswordResetEmail(user.email, token);
        if (!sendResult || !sendResult.success) {
            logger.error('Falha ao enviar email de recuperação de senha', {
                userId: user.id,
                error: sendResult?.error || 'desconhecido'
            });
            return res.status(503).json({
                success: false,
                message: 'Não foi possível enviar o e-mail de recuperação. Verifique se o e-mail está correto e tente novamente em alguns minutos.'
            });
        }

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

        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            const msg = (passwordValidation.errors && passwordValidation.errors[0]) || 'Senha inválida. Use no mínimo 6 caracteres, com maiúscula, minúscula e número.';
            return error(res, msg, 400);
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

