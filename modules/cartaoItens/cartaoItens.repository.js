/**
 * Repository: profile_items (itens do cartão).
 * Todos os métodos recebem client (controller/service gerencia conexão).
 */

async function listByUserId(client, userId) {
    const { rows } = await client.query(
        'SELECT * FROM profile_items WHERE user_id = $1 ORDER BY display_order ASC',
        [userId]
    );
    return rows;
}

async function getById(client, itemId, userId) {
    const { rows } = await client.query(
        'SELECT * FROM profile_items WHERE id = $1 AND user_id = $2',
        [itemId, userId]
    );
    return rows[0] || null;
}

async function getByIdForCheck(client, itemId) {
    const { rows } = await client.query(
        'SELECT id, user_id, item_type FROM profile_items WHERE id = $1',
        [itemId]
    );
    return rows[0] || null;
}

async function getDigitalFormData(client, profileItemId) {
    const { rows } = await client.query(
        `SELECT * FROM digital_form_items WHERE profile_item_id = $1 
         ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
        [profileItemId]
    );
    return rows[0] || null;
}

async function getGuestListData(client, profileItemId) {
    const { rows } = await client.query(
        `SELECT * FROM guest_list_items WHERE profile_item_id = $1 
         ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
        [profileItemId]
    );
    return rows[0] || null;
}

module.exports = {
    listByUserId,
    getById,
    getByIdForCheck,
    getDigitalFormData,
    getGuestListData
};
