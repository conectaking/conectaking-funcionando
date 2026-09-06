/**
 * Repository: personalização da marca da empresa (logo no perfil do dono).
 */
const db = require('../../../db');

async function updateBranding(userId, payload) {
    // Colunas company_logo_* vêm da migration 244/246 — se faltarem, não rebentar com 500.
    const cols = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
          AND column_name IN ('company_logo_url', 'company_logo_size', 'company_logo_link')
    `);
    const have = new Set(cols.rows.map((r) => r.column_name));
    if (!have.has('company_logo_url')) {
        const err = new Error('Colunas company_logo_* em falta. Execute as migrations 244/246.');
        err.status = 503;
        throw err;
    }
    const sets = ['company_logo_url = $1'];
    const vals = [payload.logoUrl];
    let i = 2;
    if (have.has('company_logo_size')) {
        sets.push(`company_logo_size = $${i++}`);
        vals.push(payload.logoSize);
    }
    if (have.has('company_logo_link')) {
        sets.push(`company_logo_link = $${i++}`);
        vals.push(payload.logoLink);
    }
    vals.push(userId);
    await db.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
        vals
    );
}

module.exports = {
    updateBranding,
};
