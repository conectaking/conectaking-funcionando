/**
 * Helper: colunas existentes em user_profiles (cache por processo).
 */
const db = require('../../../db');
let cachedColumns = null;

async function getExistingProfileColumns() {
    if (cachedColumns) return cachedColumns;
    const r = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
        ORDER BY ordinal_position
    `);
    cachedColumns = r.rows.map((row) => row.column_name);
    return cachedColumns;
}

module.exports = { getExistingProfileColumns };
