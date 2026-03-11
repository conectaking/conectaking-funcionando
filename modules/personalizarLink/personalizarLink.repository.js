/**
 * Repository: configuração do preview de link (site_link_preview_config).
 */
const db = require('../../db');

async function getActiveConfig() {
    const { rows } = await db.query(`
        SELECT * FROM site_link_preview_config
        WHERE is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
    `);
    return rows[0] || null;
}

async function deactivateAll(client) {
    await client.query(`
        UPDATE site_link_preview_config SET is_active = false WHERE is_active = true
    `);
}

async function insertConfig(client, payload) {
    const { rows } = await client.query(`
        INSERT INTO site_link_preview_config
        (title, subtitle, bg_color_1, bg_color_2, text_color, subtitle_color, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        RETURNING *
    `, [
        payload.title,
        payload.subtitle,
        payload.bg_color_1,
        payload.bg_color_2,
        payload.text_color,
        payload.subtitle_color,
    ]);
    return rows[0];
}

module.exports = {
    getActiveConfig,
    deactivateAll,
    insertConfig,
};
