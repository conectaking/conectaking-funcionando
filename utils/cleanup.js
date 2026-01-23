/**
 * Utilitários para limpeza e manutenção do banco de dados
 * Remove dados expirados, tokens antigos, etc.
 */

const db = require('../db');
const logger = require('../utils/logger');

/**
 * Limpa tokens de refresh expirados
 */
async function cleanupExpiredRefreshTokens() {
    try {
        const result = await db.query(
            'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
        );

        if (result.rowCount > 0) {
            logger.info(`Limpeza: ${result.rowCount} refresh tokens expirados removidos`);
        }

        return result.rowCount;
    } catch (error) {
        logger.error('Erro ao limpar refresh tokens expirados', error);
        throw error;
    }
}

/**
 * Limpa tokens de recuperação de senha expirados
 */
async function cleanupExpiredPasswordResetTokens() {
    try {
        const result = await db.query(
            'DELETE FROM password_reset_tokens WHERE expires_at < NOW()'
        );

        if (result.rowCount > 0) {
            logger.info(`Limpeza: ${result.rowCount} tokens de recuperação expirados removidos`);
        }

        return result.rowCount;
    } catch (error) {
        logger.error('Erro ao limpar tokens de recuperação expirados', error);
        throw error;
    }
}

/**
 * Limpa cache antigo (se usar cache em banco)
 */
async function cleanupOldCache() {
    try {
        // Exemplo - ajustar conforme implementação de cache
        const result = await db.query(
            `DELETE FROM cache WHERE expires_at < NOW()`
        );

        if (result.rowCount > 0) {
            logger.info(`Limpeza: ${result.rowCount} entradas de cache expiradas removidas`);
        }

        return result.rowCount;
    } catch (error) {
        // Ignora se tabela não existir
        if (error.code !== '42P01') {
            logger.error('Erro ao limpar cache', error);
        }
        return 0;
    }
}

/**
 * Executa todas as limpezas
 */
async function runCleanup() {
    logger.info('Iniciando limpeza de dados expirados...');
    
    try {
        const results = {
            refreshTokens: await cleanupExpiredRefreshTokens(),
            passwordResetTokens: await cleanupExpiredPasswordResetTokens(),
            cache: await cleanupOldCache()
        };

        logger.info('Limpeza concluída', results);
        return results;
    } catch (error) {
        logger.error('Erro durante limpeza', error);
        throw error;
    }
}

module.exports = {
    cleanupExpiredRefreshTokens,
    cleanupExpiredPasswordResetTokens,
    cleanupOldCache,
    runCleanup
};

