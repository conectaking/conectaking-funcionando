/**
 * Garante que o utilizador tenha pelo menos o item padrão «Bíblia» no cartão.
 * Contas criadas fora de /api/auth/register podem ficar sem profile_items;
 * o GET /api/profile e o registo usam esta rotina para alinhar.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 */
async function ensureDefaultProfileItemsForUser(client, userId) {
    if (!userId) return;
    const cnt = await client.query(
        'SELECT COUNT(*)::int AS c FROM profile_items WHERE user_id = $1',
        [userId]
    );
    const n = parseInt(cnt.rows[0]?.c, 10) || 0;
    if (n > 0) return;

    const bibleItem = await client.query(
        `INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
         VALUES ($1, 'bible', 'Bíblia', true, 0) RETURNING id`,
        [userId]
    );
    await client.query(
        `INSERT INTO bible_items (profile_item_id, translation_code, is_visible) VALUES ($1, 'nvi', true)`,
        [bibleItem.rows[0].id]
    );
}

module.exports = { ensureDefaultProfileItemsForUser };
