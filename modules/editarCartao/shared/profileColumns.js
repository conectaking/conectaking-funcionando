/**
 * Helper: colunas existentes em user_profiles.
 * Cache curto para não perder colunas novas após migrations sem reiniciar o processo.
 */
const db = require('../../../db');
let cachedColumns = null;
let cachedAt = 0;
const CACHE_MS = 30 * 1000;

async function getExistingProfileColumns() {
    const now = Date.now();
    if (cachedColumns && (now - cachedAt) < CACHE_MS) return cachedColumns;
    const r = await db.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
        ORDER BY ordinal_position
    `);
    cachedColumns = r.rows.map((row) => row.column_name);
    cachedAt = now;
    return cachedColumns;
}

function invalidateProfileColumnsCache() {
    cachedColumns = null;
    cachedAt = 0;
}

module.exports = { getExistingProfileColumns, invalidateProfileColumnsCache };
