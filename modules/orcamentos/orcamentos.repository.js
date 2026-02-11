const db = require('../../db');
const logger = require('../../utils/logger');

async function insert(userId, data) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `INSERT INTO orcamento_leads (user_id, nome, email, whatsapp, profissao, respostas, ticket, ticket_reason, recommendation, status)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) RETURNING *`,
            [
                userId,
                data.nome || null,
                data.email || null,
                data.whatsapp || null,
                data.profissao || null,
                JSON.stringify(data.respostas || {}),
                data.ticket || 'medium',
                data.ticket_reason || null,
                data.recommendation || null,
                data.status || 'novo'
            ]
        );
        return r.rows[0];
    } finally {
        client.release();
    }
}

async function listByUserId(userId, filters = {}) {
    const client = await db.pool.connect();
    try {
        let q = 'SELECT * FROM orcamento_leads WHERE user_id = $1';
        const params = [userId];
        if (filters.ticket) {
            params.push(filters.ticket);
            q += ' AND ticket = $' + params.length;
        }
        if (filters.status) {
            params.push(filters.status);
            q += ' AND status = $' + params.length;
        }
        q += ' ORDER BY created_at DESC';
        const r = await client.query(q, params);
        return r.rows;
    } finally {
        client.release();
    }
}

async function getById(id, userId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM orcamento_leads WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function updateStatus(id, userId, status) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'UPDATE orcamento_leads SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [status, id, userId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function remove(id, userId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'DELETE FROM orcamento_leads WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

module.exports = {
    insert,
    listByUserId,
    getById,
    updateStatus,
    remove
};
