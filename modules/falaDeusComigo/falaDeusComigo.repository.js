const db = require('../../db');
const logger = require('../../utils/logger');

async function findByProfileItemId(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM fala_deus_comigo_items WHERE profile_item_id = $1',
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
            'INSERT INTO fala_deus_comigo_items (profile_item_id) VALUES ($1) RETURNING *',
            [profileItemId]
        );
        return r.rows[0];
    } catch (err) {
        logger.error('falaDeusComigo.repository create:', err);
        throw err;
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

/** Retorna uma mensagem aleatória para o profile_item (uma por visita = uma por request) */
async function getRandomMensagem(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `SELECT id, profile_item_id, versiculo_ref, versiculo_texto, resumo, mensagem, attachment_url
             FROM fala_deus_comigo_mensagens
             WHERE profile_item_id = $1
             ORDER BY RANDOM()
             LIMIT 1`,
            [profileItemId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function listMensagens(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `SELECT id, profile_item_id, versiculo_ref, versiculo_texto, resumo, mensagem, attachment_url, display_order, created_at
             FROM fala_deus_comigo_mensagens
             WHERE profile_item_id = $1
             ORDER BY display_order ASC, id ASC`,
            [profileItemId]
        );
        return r.rows;
    } finally {
        client.release();
    }
}

async function createMensagem(profileItemId, data) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `INSERT INTO fala_deus_comigo_mensagens (profile_item_id, versiculo_ref, versiculo_texto, resumo, mensagem, attachment_url, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                profileItemId,
                data.versiculo_ref || '',
                data.versiculo_texto || null,
                data.resumo || null,
                data.mensagem || '',
                data.attachment_url || null,
                data.display_order != null ? data.display_order : 0
            ]
        );
        return r.rows[0];
    } catch (err) {
        logger.error('falaDeusComigo.repository createMensagem:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function updateMensagem(id, profileItemId, data) {
    const client = await db.pool.connect();
    try {
        const allowed = ['versiculo_ref', 'versiculo_texto', 'resumo', 'mensagem', 'attachment_url', 'display_order'];
        const sets = [];
        const values = [];
        let i = 1;
        for (const key of allowed) {
            if (!(key in data)) continue;
            sets.push(`${key} = $${i++}`);
            values.push(data[key]);
        }
        if (sets.length === 0) return await getMensagemById(id, profileItemId);
        values.push(id, profileItemId);
        const r = await client.query(
            `UPDATE fala_deus_comigo_mensagens SET ${sets.join(', ')}, updated_at = NOW()
             WHERE id = $${i} AND profile_item_id = $${i + 1} RETURNING *`,
            values
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getMensagemById(id, profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM fala_deus_comigo_mensagens WHERE id = $1 AND profile_item_id = $2',
            [id, profileItemId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function deleteMensagem(id, profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'DELETE FROM fala_deus_comigo_mensagens WHERE id = $1 AND profile_item_id = $2 RETURNING id',
            [id, profileItemId]
        );
        return r.rowCount > 0;
    } finally {
        client.release();
    }
}

module.exports = {
    findByProfileItemId,
    create,
    ensureOwnership,
    getRandomMensagem,
    listMensagens,
    createMensagem,
    updateMensagem,
    getMensagemById,
    deleteMensagem
};
