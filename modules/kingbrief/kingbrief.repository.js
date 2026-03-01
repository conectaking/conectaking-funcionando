/**
 * KingBrief – Repositório (acesso a kingbrief_meetings)
 * CRUD para reuniões: criar, listar por user, obter por id, atualizar actions/title, eliminar.
 */

const db = require('../../db');
const logger = require('../../utils/logger');

const TABLE = 'kingbrief_meetings';

/**
 * Criar uma nova reunião
 * @param {Object} data - { user_id, title, audio_url, transcript, summary, topics_json, actions_json, mindmap_json, duration_sec }
 * @returns {Promise<Object>} meeting criado
 */
async function create(data) {
    const client = await db.pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO ${TABLE} (user_id, title, audio_url, transcript, summary, topics_json, actions_json, mindmap_json, duration_sec)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                data.user_id,
                data.title || null,
                data.audio_url || null,
                data.transcript || null,
                data.summary || null,
                JSON.stringify(data.topics_json || []),
                JSON.stringify(data.actions_json || []),
                JSON.stringify(data.mindmap_json || { id: 'root', title: 'Tema Central', collapsed: false, children: [] }),
                data.duration_sec || null
            ]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

/**
 * Listar reuniões do utilizador (paginação)
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function findByUserId(userId, page = 1, limit = 20) {
    const client = await db.pool.connect();
    try {
        const offset = (page - 1) * limit;
        const countResult = await client.query(
            `SELECT COUNT(*)::int AS total FROM ${TABLE} WHERE user_id = $1`,
            [userId]
        );
        const total = countResult.rows[0].total;
        const listResult = await client.query(
            `SELECT id, user_id, title, audio_url, summary, topics_json, actions_json, mindmap_json, duration_sec, created_at
             FROM ${TABLE}
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return { items: listResult.rows, total };
    } finally {
        client.release();
    }
}

/**
 * Obter uma reunião por id (e user_id para garantir ownership)
 * @param {string} id - UUID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function findById(id, userId) {
    const result = await db.query(
        `SELECT * FROM ${TABLE} WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );
    return result.rows[0] || null;
}

/**
 * Atualizar actions_json e opcionalmente title
 * @param {string} id
 * @param {string} userId
 * @param {Object} updates - { actions_json, title }
 * @returns {Promise<Object|null>}
 */
async function update(id, userId, updates) {
    const client = await db.pool.connect();
    try {
        const sets = [];
        const values = [];
        let n = 1;
        if (updates.actions_json !== undefined) {
            sets.push(`actions_json = $${n}::jsonb`);
            values.push(JSON.stringify(updates.actions_json));
            n++;
        }
        if (updates.title !== undefined) {
            sets.push(`title = $${n}`);
            values.push(updates.title);
            n++;
        }
        if (updates.mindmap_json !== undefined) {
            sets.push(`mindmap_json = $${n}::jsonb`);
            values.push(JSON.stringify(updates.mindmap_json));
            n++;
        }
        if (updates.business_json !== undefined) {
            sets.push(`business_json = $${n}::jsonb`);
            values.push(JSON.stringify(updates.business_json));
            n++;
        }
        if (updates.lesson_json !== undefined) {
            sets.push(`lesson_json = $${n}::jsonb`);
            values.push(JSON.stringify(updates.lesson_json));
            n++;
        }
        if (updates.communication_json !== undefined) {
            sets.push(`communication_json = $${n}::jsonb`);
            values.push(JSON.stringify(updates.communication_json));
            n++;
        }
        if (sets.length === 0) return findById(id, userId);
        values.push(id, userId);
        const result = await client.query(
            `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

/**
 * Eliminar reunião (apenas se pertencer ao user)
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<boolean>} true se eliminou
 */
async function remove(id, userId) {
    const result = await db.query(
        `DELETE FROM ${TABLE} WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );
    return (result.rowCount || 0) > 0;
}

/**
 * Contar reuniões do user (para uso/estatísticas)
 * @param {string} userId
 * @param {string} [since] - data ISO (opcional, ex.: início do mês)
 * @returns {Promise<{ total: number, countThisMonth?: number }>}
 */
async function countByUser(userId, since = null) {
    const totalResult = await db.query(
        `SELECT COUNT(*)::int AS total FROM ${TABLE} WHERE user_id = $1`,
        [userId]
    );
    let countThisMonth = null;
    if (since) {
        const monthResult = await db.query(
            `SELECT COUNT(*)::int AS c FROM ${TABLE} WHERE user_id = $1 AND created_at >= $2`,
            [userId, since]
        );
        countThisMonth = monthResult.rows[0].c;
    }
    return {
        total: totalResult.rows[0].total,
        countThisMonth: countThisMonth ?? totalResult.rows[0].total
    };
}

module.exports = {
    create,
    findByUserId,
    findById,
    update,
    remove,
    countByUser
};
