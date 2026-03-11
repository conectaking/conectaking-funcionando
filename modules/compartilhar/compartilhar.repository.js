/**
 * Repository: dados para vCard (usuário por identificador, perfil, itens).
 */
const db = require('../../db');

async function getUserIdByIdentifier(identifier) {
    const { rows } = await db.query(
        'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
        [identifier]
    );
    return rows[0]?.id ?? null;
}

async function getProfile(userId) {
    const { rows } = await db.query(
        'SELECT display_name, whatsapp FROM user_profiles WHERE user_id = $1',
        [userId]
    );
    return rows[0] || null;
}

async function getActiveItems(userId) {
    const { rows } = await db.query(
        'SELECT item_type, title, destination_url, pix_key FROM profile_items WHERE user_id = $1 AND is_active = TRUE ORDER BY display_order ASC',
        [userId]
    );
    return rows;
}

module.exports = {
    getUserIdByIdentifier,
    getProfile,
    getActiveItems,
};
