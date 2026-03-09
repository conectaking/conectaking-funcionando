const db = require('../../db');
const logger = require('../../utils/logger');

async function insert(userId, data) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `INSERT INTO documentos (user_id, tipo, titulo, emitente_json, cliente_json, itens_json, anexos_json, observacoes, condicoes_pagamento, data_documento, validade_ate, link_token, numero_sequencial)
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                userId,
                data.tipo || 'recibo',
                data.titulo || null,
                JSON.stringify(data.emitente_json || {}),
                JSON.stringify(data.cliente_json || {}),
                JSON.stringify(data.itens_json || []),
                JSON.stringify(data.anexos_json || []),
                data.observacoes || null,
                data.condicoes_pagamento || null,
                data.data_documento || null,
                data.validade_ate || null,
                data.link_token,
                data.numero_sequencial || null
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
        let q = 'SELECT * FROM documentos WHERE user_id = $1';
        const params = [userId];
        if (filters.tipo) {
            params.push(filters.tipo);
            q += ' AND tipo = $' + params.length;
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
            'SELECT * FROM documentos WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getByLinkToken(linkToken) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM documentos WHERE link_token = $1',
            [linkToken]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function update(id, userId, data) {
    const client = await db.pool.connect();
    try {
        const fields = [];
        const values = [];
        let i = 1;
        const allowed = ['titulo', 'emitente_json', 'cliente_json', 'itens_json', 'anexos_json', 'observacoes', 'condicoes_pagamento', 'data_documento', 'validade_ate'];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                if (key.endsWith('_json')) {
                    fields.push(`${key} = $${i}::jsonb`);
                    values.push(JSON.stringify(data[key]));
                } else {
                    fields.push(`${key} = $${i}`);
                    values.push(data[key]);
                }
                i += 1;
            }
        }
        if (fields.length === 0) return getById(id, userId);
        values.push(id, userId);
        const r = await client.query(
            `UPDATE documentos SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
            values
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function updateByToken(linkToken, data) {
    const client = await db.pool.connect();
    try {
        const fields = [];
        const values = [];
        let i = 1;
        const allowed = ['titulo', 'emitente_json', 'cliente_json', 'itens_json', 'anexos_json', 'observacoes', 'condicoes_pagamento', 'data_documento', 'validade_ate'];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                if (key.endsWith('_json')) {
                    fields.push(`${key} = $${i}::jsonb`);
                    values.push(JSON.stringify(data[key]));
                } else {
                    fields.push(`${key} = $${i}`);
                    values.push(data[key]);
                }
                i += 1;
            }
        }
        if (fields.length === 0) return getByLinkToken(linkToken);
        values.push(linkToken);
        const r = await client.query(
            `UPDATE documentos SET ${fields.join(', ')}, updated_at = NOW() WHERE link_token = $${i} RETURNING *`,
            values
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
            'DELETE FROM documentos WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function nextNumeroSequencial(userId, tipo) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `SELECT COALESCE(MAX(numero_sequencial), 0) + 1 AS next_num
             FROM documentos WHERE user_id = $1 AND tipo = $2`,
            [userId, tipo]
        );
        return r.rows[0] ? r.rows[0].next_num : 1;
    } finally {
        client.release();
    }
}

async function getSettings(userId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT header_color, accent_color, bg_color, last_document_id, default_logo_url, updated_at FROM documentos_user_settings WHERE user_id = $1',
            [userId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function upsertSettings(userId, data) {
    const client = await db.pool.connect();
    try {
        const defaultLogo = data.default_logo_url !== undefined
            ? (data.default_logo_url == null || data.default_logo_url === '' ? null : String(data.default_logo_url).trim())
            : undefined;
        const r = await client.query(
            `INSERT INTO documentos_user_settings (user_id, header_color, accent_color, bg_color, last_document_id, default_logo_url, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
               header_color = COALESCE(EXCLUDED.header_color, documentos_user_settings.header_color),
               accent_color = COALESCE(EXCLUDED.accent_color, documentos_user_settings.accent_color),
               bg_color = COALESCE(EXCLUDED.bg_color, documentos_user_settings.bg_color),
               last_document_id = COALESCE(EXCLUDED.last_document_id, documentos_user_settings.last_document_id),
               default_logo_url = CASE WHEN EXCLUDED.default_logo_url IS NOT NULL THEN EXCLUDED.default_logo_url ELSE documentos_user_settings.default_logo_url END,
               updated_at = NOW()
             RETURNING *`,
            [
                userId,
                data.header_color != null ? String(data.header_color).replace(/^#/, '').trim() || null : null,
                data.accent_color != null ? String(data.accent_color).replace(/^#/, '').trim() || null : null,
                data.bg_color != null ? String(data.bg_color).replace(/^#/, '').trim() || null : null,
                data.last_document_id != null ? parseInt(data.last_document_id, 10) || null : null,
                defaultLogo !== undefined ? defaultLogo : null
            ]
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
    getByLinkToken,
    update,
    updateByToken,
    remove,
    nextNumeroSequencial,
    getSettings,
    upsertSettings
};
