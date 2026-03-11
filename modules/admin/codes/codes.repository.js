/**
 * Repository: códigos de registro admin (listagem, gerar, atualizar, auto-delete).
 * Único que acessa o banco para o módulo admin/codes.
 */
const db = require('../../../db');

function buildCodesQuery(whereClause) {
    return `
        SELECT 
            c.code, 
            c.is_claimed, 
            c.created_at, 
            c.claimed_at,
            c.expires_at,
            u.email as claimed_by_email,
            gen.email as generated_by_email,
            CASE 
                WHEN c.expires_at IS NULL THEN 'no_expiration'
                WHEN c.expires_at < NOW() THEN 'expired'
                ELSE 'active'
            END as expiration_status
        FROM registration_codes c
        LEFT JOIN users u ON c.claimed_by_user_id = u.id
        LEFT JOIN users gen ON c.generated_by_user_id = gen.id
        ${whereClause}
        ORDER BY c.created_at DESC
    `;
}

async function listCodes(filter) {
    let whereClause = '';
    if (filter === 'expired') {
        whereClause = 'WHERE c.expires_at IS NOT NULL AND c.expires_at < NOW()';
    } else if (filter === 'active') {
        whereClause = 'WHERE c.expires_at IS NULL OR c.expires_at >= NOW()';
    }
    const { rows } = await db.query(buildCodesQuery(whereClause));
    return rows;
}

async function insertCode(code, expiresAt) {
    await db.query(
        'INSERT INTO registration_codes (code, expires_at) VALUES ($1, $2)',
        [code, expiresAt]
    );
}

async function updateCodeExpires(code, expiresAt) {
    const result = await db.query(
        'UPDATE registration_codes SET expires_at = $1 WHERE code = $2 RETURNING *',
        [expiresAt, code]
    );
    return result.rows[0] || null;
}

async function getAutoDeleteConfig() {
    const { rows } = await db.query(
        'SELECT * FROM code_auto_delete_config ORDER BY days_after_expiration'
    );
    return rows;
}

async function saveAutoDeleteConfig(daysAfterExpiration, isActive) {
    const { rows } = await db.query(
        `INSERT INTO code_auto_delete_config (days_after_expiration, is_active, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (days_after_expiration) 
         DO UPDATE SET is_active = $2, updated_at = NOW()
         RETURNING *`,
        [daysAfterExpiration, isActive]
    );
    return rows[0];
}

async function getActiveAutoDeleteConfigs() {
    const { rows } = await db.query(
        'SELECT days_after_expiration FROM code_auto_delete_config WHERE is_active = true'
    );
    return rows;
}

async function deleteExpiredCodes(cutoffDate) {
    const result = await db.query(
        `DELETE FROM registration_codes 
         WHERE expires_at IS NOT NULL 
         AND expires_at < $1 
         AND is_claimed = false
         RETURNING code`,
        [cutoffDate]
    );
    return result.rowCount;
}

async function deleteCode(code) {
    const result = await db.query('DELETE FROM registration_codes WHERE code = $1', [code]);
    return result.rowCount > 0;
}

module.exports = {
    listCodes,
    insertCode,
    updateCodeExpires,
    getAutoDeleteConfig,
    saveAutoDeleteConfig,
    getActiveAutoDeleteConfigs,
    deleteExpiredCodes,
    deleteCode,
};
