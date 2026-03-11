/**
 * Repository: logomarca padrão (app_config.default_branding).
 * Único que acessa o banco para branding admin.
 */
const db = require('../../../db');

/**
 * Busca valor da config default_branding
 * @returns {Promise<{ logo_url?: string, logo_size?: number, logo_link?: string }>}
 */
async function getDefaultBranding() {
    const { rows } = await db.query(
        `SELECT value FROM app_config WHERE key = 'default_branding' LIMIT 1`
    );
    const raw = rows[0]?.value || {};
    return {
        logo_url: raw.logo_url ?? null,
        logo_size: raw.logo_size ?? 60,
        logo_link: raw.logo_link ?? null,
    };
}

/**
 * Atualiza logomarca padrão
 * @param {{ logo_url?: string|null, logo_size?: number, logo_link?: string|null }} payload
 */
async function updateDefaultBranding(payload) {
    await db.query(
        `INSERT INTO app_config (key, value, updated_at)
         VALUES ('default_branding', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
        [JSON.stringify({
            logo_url: payload.logo_url ?? null,
            logo_size: payload.logo_size ?? 60,
            logo_link: payload.logo_link ?? null,
        })]
    );
}

module.exports = {
    getDefaultBranding,
    updateDefaultBranding,
};
