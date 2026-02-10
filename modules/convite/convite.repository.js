const db = require('../../db');
const logger = require('../../utils/logger');

const DEFAULT_CONVITE = {
    titulo: 'CASAMENTO DE',
    subtitulo: 'Nomes dos Noivos',
    texto_abrir: 'Toque para abrir',
    data_dia: 12,
    data_mes: 'FEVEREIRO',
    data_ano: 2026,
    dia_semana: 'QUINTA-FEIRA',
    hora: '11H30',
    som_habilitado: false,
    mostrar_contagem_regressiva: true,
    share_habilitado: true,
    calendar_habilitado: true,
    tema: 'classico',
    cor_primaria: '#8B4513',
    cor_secundaria: '#D2691E',
    rsvp_label: 'Confirmar presença',
    galeria_fotos: []
};

async function findByProfileItemId(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM convite_items WHERE profile_item_id = $1',
            [profileItemId]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function findBySlug(slug) {
    const client = await db.pool.connect();
    try {
        let r = await client.query(
            `SELECT c.*, pi.slug, pi.is_active
             FROM convite_items c
             JOIN profile_items pi ON pi.id = c.profile_item_id
             WHERE pi.slug = $1`,
            [slug]
        );
        if (r.rows[0]) return r.rows[0];
        r = await client.query(
            `SELECT c.*, pi.slug, pi.is_active
             FROM convite_items c
             JOIN profile_items pi ON pi.id = c.profile_item_id
             JOIN users u ON u.id = pi.user_id
             WHERE LOWER(u.profile_slug) = LOWER($1) AND pi.item_type = 'convite' AND pi.is_active = true
             ORDER BY pi.display_order ASC, pi.id ASC LIMIT 1`,
            [slug]
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
            `INSERT INTO convite_items (
                profile_item_id, titulo, subtitulo, texto_abrir,
                data_dia, data_mes, data_ano, dia_semana, hora,
                som_habilitado, mostrar_contagem_regressiva, share_habilitado,
                calendar_habilitado, tema, cor_primaria, cor_secundaria, rsvp_label, galeria_fotos
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
            ) RETURNING *`,
            [
                profileItemId,
                DEFAULT_CONVITE.titulo,
                DEFAULT_CONVITE.subtitulo,
                DEFAULT_CONVITE.texto_abrir,
                DEFAULT_CONVITE.data_dia,
                DEFAULT_CONVITE.data_mes,
                DEFAULT_CONVITE.data_ano,
                DEFAULT_CONVITE.dia_semana,
                DEFAULT_CONVITE.hora,
                DEFAULT_CONVITE.som_habilitado,
                DEFAULT_CONVITE.mostrar_contagem_regressiva,
                DEFAULT_CONVITE.share_habilitado,
                DEFAULT_CONVITE.calendar_habilitado,
                DEFAULT_CONVITE.tema,
                DEFAULT_CONVITE.cor_primaria,
                DEFAULT_CONVITE.cor_secundaria,
                DEFAULT_CONVITE.rsvp_label,
                JSON.stringify(DEFAULT_CONVITE.galeria_fotos)
            ]
        );
        return r.rows[0];
    } catch (err) {
        logger.error('convite.repository create:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function update(profileItemId, data) {
    const client = await db.pool.connect();
    try {
        const allowed = [
            'titulo', 'subtitulo', 'texto_abrir', 'subtitulo_extra', 'texto_pagina_2',
            'data_dia', 'data_mes', 'data_ano', 'dia_semana', 'hora',
            'local_nome', 'local_endereco', 'local_maps_url', 'dress_code',
            'rsvp_url', 'rsvp_label',
            'som_habilitado', 'audio_url', 'imagem_envelope_url', 'imagem_fundo_url', 'imagem_selo_url',
            'cor_primaria', 'cor_secundaria', 'tema',
            'mostrar_contagem_regressiva', 'share_habilitado', 'calendar_habilitado',
            'galeria_fotos'
        ];
        const sets = [];
        const values = [];
        let i = 1;
        for (const key of allowed) {
            if (!(key in data)) continue;
            let val = data[key];
            if (key === 'galeria_fotos') val = JSON.stringify(Array.isArray(val) ? val : []);
            if (key === 'som_habilitado' || key === 'mostrar_contagem_regressiva' || key === 'share_habilitado' || key === 'calendar_habilitado')
                val = !!val;
            sets.push(`${key} = $${i++}`);
            values.push(val);
        }
        if (sets.length === 0) return await findByProfileItemId(profileItemId);
        values.push(profileItemId);
        const r = await client.query(
            `UPDATE convite_items SET ${sets.join(', ')}, updated_at = NOW() WHERE profile_item_id = $${i} RETURNING *`,
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

async function incrementViewCount(conviteItemId) {
    const client = await db.pool.connect();
    try {
        await client.query(
            'UPDATE convite_items SET view_count = view_count + 1 WHERE id = $1',
            [conviteItemId]
        );
        await client.query(
            'INSERT INTO convite_views (convite_item_id) VALUES ($1)',
            [conviteItemId]
        );
    } catch (e) {
        logger.warn('convite incrementViewCount:', e.message);
    } finally {
        client.release();
    }
}

async function getStats(conviteItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT view_count FROM convite_items WHERE id = $1',
            [conviteItemId]
        );
        const total = r.rows[0]?.view_count || 0;
        const recent = await client.query(
            'SELECT COUNT(*)::int AS c FROM convite_views WHERE convite_item_id = $1 AND viewed_at > NOW() - INTERVAL \'7 days\'',
            [conviteItemId]
        );
        return { view_count: total, views_last_7_days: recent.rows[0]?.c || 0 };
    } finally {
        client.release();
    }
}

async function generatePreviewToken(profileItemId, userId) {
    const ok = await ensureOwnership(profileItemId, userId);
    if (!ok) return null;
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const client = await db.pool.connect();
    try {
        await client.query(
            'UPDATE convite_items SET preview_token = $1 WHERE profile_item_id = $2',
            [token, profileItemId]
        );
        return token;
    } finally {
        client.release();
    }
}

module.exports = {
    DEFAULT_CONVITE,
    findByProfileItemId,
    findBySlug,
    create,
    update,
    ensureOwnership,
    incrementViewCount,
    getStats,
    generatePreviewToken
};
