/**
 * Funções auxiliares para testes
 * Facilita criação de dados de teste
 */

const db = require('../db');
const { hashPassword } = require('./password');
const { generateTokenPair, saveRefreshToken } = require('../middleware/refreshToken');

/**
 * Cria um usuário de teste
 */
async function createTestUser(email = 'test@test.com', password = 'Test123!', accountType = 'individual') {
    const passwordHash = await hashPassword(password);
    const userId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await db.query(
        `INSERT INTO users (id, email, password_hash, profile_slug, account_type, subscription_status) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, email, passwordHash, userId, accountType, 'active']
    );

    // Criar perfil básico
    await db.query(
        'INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)',
        [userId, email]
    );

    return result.rows[0];
}

/**
 * Remove usuário de teste
 */
async function deleteTestUser(userId) {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Cria tokens de autenticação para teste
 */
async function createTestTokens(user) {
    const { accessToken, refreshToken } = generateTokenPair(user);
    await saveRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
}

/**
 * Limpa dados de teste
 */
async function cleanupTestData() {
    await db.query("DELETE FROM users WHERE id LIKE 'test_%'");
}

module.exports = {
    createTestUser,
    deleteTestUser,
    createTestTokens,
    cleanupTestData
};

