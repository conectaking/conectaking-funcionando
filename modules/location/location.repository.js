const db = require('../../db');
const logger = require('../../utils/logger');

async function findByProfileItemId(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT id, profile_item_id, address, address_formatted, latitude, longitude, place_name, created_at, updated_at FROM location_items WHERE profile_item_id = $1',
            [profileItemId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function create(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `INSERT INTO location_items (profile_item_id) VALUES ($1) RETURNING *`,
            [profileItemId]
        );
        return r.rows[0];
    } catch (err) {
        logger.error('location.repository create:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function update(profileItemId, data) {
    const client = await db.pool.connect();
    try {
        const allowed = ['address', 'address_formatted', 'latitude', 'longitude', 'place_name'];
        const sets = [];
        const values = [];
        let i = 1;
        for (const key of allowed) {
            if (!(key in data)) continue;
            sets.push(`${key} = $${i++}`);
            values.push(data[key]);
        }
        if (sets.length === 0) return await findByProfileItemId(profileItemId);
        values.push(profileItemId);
        const r = await client.query(
            `UPDATE location_items SET ${sets.join(', ')}, updated_at = NOW() WHERE profile_item_id = $${i} RETURNING *`,
            values
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function ensureOwnership(profileItemId, userId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT 1 FROM profile_items WHERE id = $1 AND user_id = $2',
            [profileItemId, userId]
        );
        return r.rows.length > 0;
    } finally {
        client.release();
    }
}

module.exports = {
    findByProfileItemId,
    create,
    update,
    ensureOwnership
};
