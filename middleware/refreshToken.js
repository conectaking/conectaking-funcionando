/**
 * Middleware e utilitários para refresh tokens
 * Permite renovação automática de tokens JWT
 */

const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Gera par de tokens (access + refresh)
 */
function generateTokenPair(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin || false,
        accountType: user.account_type
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn // 7 dias por padrão
    });

    const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn } // 30 dias por padrão
    );

    return { accessToken, refreshToken };
}

/**
 * Salva refresh token no banco de dados
 */
async function saveRefreshToken(userId, refreshToken) {
    try {
        // Verificar se a tabela refresh_tokens existe
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'refresh_tokens'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            logger.warn('Tabela refresh_tokens não existe. Pulando salvamento do refresh token.');
            return; // Retorna sem erro se a tabela não existir
        }

        // Remove tokens antigos do usuário (opcional - pode manter múltiplos dispositivos)
        await db.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()',
            [userId]
        ).catch(err => {
            // Se der erro na deleção, continua mesmo assim
            logger.debug('Erro ao deletar tokens antigos (continuando)', { error: err.message });
        });

        // Calcula data de expiração (30 dias)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Insere novo token (cada login gera token único; tabela permite múltiplos por user_id para vários dispositivos)
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at) 
             VALUES ($1, $2, $3)`,
            [userId, refreshToken, expiresAt]
        );

        logger.debug('Refresh token salvo', { userId });
    } catch (error) {
        // Se for erro de constraint ou tabela não existe, apenas loga e continua
        if (error.code === '42P01' || error.message.includes('does not exist')) {
            logger.warn('Tabela refresh_tokens não disponível. Continuando sem salvar refresh token.');
            return;
        }
        logger.error('Erro ao salvar refresh token', { error: error.message, code: error.code });
        // Não joga erro para não quebrar o login
        // throw error;
    }
}

/**
 * Valida refresh token
 */
async function validateRefreshToken(refreshToken) {
    try {
        // Verifica assinatura do token
        const decoded = jwt.verify(refreshToken, config.jwt.secret);

        if (decoded.type !== 'refresh') {
            throw new Error('Token inválido: não é um refresh token');
        }

        // Verifica se o token existe no banco e não expirou
        const result = await db.query(
            `SELECT * FROM refresh_tokens 
             WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
            [refreshToken, decoded.userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Refresh token não encontrado ou expirado');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            logger.warn('Refresh token inválido ou expirado', { error: error.message });
            throw new Error('Refresh token inválido ou expirado');
        }
        throw error;
    }
}

/**
 * Remove refresh token (logout)
 */
async function revokeRefreshToken(refreshToken) {
    try {
        await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        logger.debug('Refresh token revogado');
    } catch (error) {
        logger.error('Erro ao revogar refresh token', error);
        throw error;
    }
}

/**
 * Remove todos os refresh tokens de um usuário (logout de todos os dispositivos)
 */
async function revokeAllUserTokens(userId) {
    try {
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        logger.info('Todos os refresh tokens revogados', { userId });
    } catch (error) {
        logger.error('Erro ao revogar todos os tokens', error);
        throw error;
    }
}

module.exports = {
    generateTokenPair,
    saveRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens
};

