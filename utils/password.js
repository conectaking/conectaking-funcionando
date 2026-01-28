/**
 * Utilitários para gerenciamento de senhas
 * Geração, validação e recuperação
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const logger = require('./logger');

/**
 * Hash de senha
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

/**
 * Compara senha com hash
 */
async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Gera token de recuperação de senha
 */
function generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Salva token de recuperação no banco
 */
async function savePasswordResetToken(userId, token) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora

    try {
        // Remove tokens antigos
        await db.query(
            'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()',
            [userId]
        );

        // Insere novo token
        await db.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
             VALUES ($1, $2, $3)`,
            [userId, token, expiresAt]
        );

        logger.debug('Token de recuperação de senha salvo', { userId });
    } catch (error) {
        logger.error('Erro ao salvar token de recuperação', error);
        throw error;
    }
}

/**
 * Valida token de recuperação
 */
async function validatePasswordResetToken(token) {
    try {
        const result = await db.query(
            `SELECT user_id FROM password_reset_tokens 
             WHERE token = $1 AND expires_at > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].user_id;
    } catch (error) {
        logger.error('Erro ao validar token de recuperação', error);
        throw error;
    }
}

/**
 * Remove token de recuperação (após uso)
 */
async function removePasswordResetToken(token) {
    try {
        await db.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
        logger.debug('Token de recuperação removido');
    } catch (error) {
        logger.error('Erro ao remover token de recuperação', error);
        throw error;
    }
}

/**
 * Valida força da senha (alinhado ao registro: min 6, maiúscula, minúscula e número)
 */
function validatePasswordStrength(password) {
    const errors = [];

    if (password.length < 6) {
        errors.push('A senha deve ter no mínimo 6 caracteres');
    }

    if (password.length > 128) {
        errors.push('A senha deve ter no máximo 128 caracteres');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('A senha deve conter pelo menos um número');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    hashPassword,
    comparePassword,
    generatePasswordResetToken,
    savePasswordResetToken,
    validatePasswordResetToken,
    removePasswordResetToken,
    validatePasswordStrength
};

