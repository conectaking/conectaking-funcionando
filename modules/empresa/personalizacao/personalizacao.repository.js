/**
 * Repository: personalização da marca da empresa (logo no perfil do dono).
 */
const db = require('../../../db');

async function updateBranding(userId, payload) {
    await db.query(
        'UPDATE users SET company_logo_url = $1, company_logo_size = $2, company_logo_link = $3 WHERE id = $4',
        [payload.logoUrl, payload.logoSize, payload.logoLink, userId]
    );
}

module.exports = {
    updateBranding,
};
