const db = require('../../db');
const logger = require('../../utils/logger');

async function findByProfileItemId(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM site_items WHERE profile_item_id = $1',
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
        const r = await client.query(
            `SELECT s.*, pi.is_active, pi.user_id
             FROM site_items s
             JOIN profile_items pi ON pi.id = s.profile_item_id
             JOIN users u ON u.id = pi.user_id
             WHERE LOWER(u.profile_slug) = LOWER($1) AND pi.item_type = 'photographer_site' AND pi.is_active = true
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
            'INSERT INTO site_items (profile_item_id) VALUES ($1) RETURNING *',
            [profileItemId]
        );
        return r.rows[0];
    } catch (err) {
        logger.error('sites.repository create:', err);
        throw err;
    } finally {
        client.release();
    }
}

const ALLOWED_KEYS = [
    'hero_pergunta', 'hero_slogan', 'hero_subtitulo',
    'hero_cta_arquetipo_texto', 'hero_cta_orcamento_texto', 'hero_cta_contato_texto', 'hero_imagem_url',
    'sobre_texto', 'sobre_imagem_url', 'servicos', 'portfolio', 'depoimentos', 'faq',
    'arquetipo_ativo', 'arquetipo_landing_titulo', 'arquetipo_landing_texto', 'arquetipo_landing_cta',
    'arquetipo_landing_imagem_url', 'arquetipo_por_que_fazer', 'arquetipo_intro_texto', 'arquetipo_campos_form',
    'contato_email', 'contato_telefone', 'contato_whatsapp', 'contato_whatsapp_mensagem', 'contato_form_ativo', 'contato_horario',
    'rede_instagram', 'rede_facebook', 'rede_linkedin',
    'meta_titulo', 'meta_description',
    'tema_primaria', 'tema_secundaria', 'tema_fonte', 'favicon_url', 'site_em_manutencao'
];

async function update(profileItemId, data) {
    const client = await db.pool.connect();
    try {
        const sets = [];
        const values = [];
        let i = 1;
        for (const key of ALLOWED_KEYS) {
            if (!(key in data)) continue;
            let val = data[key];
            if (['servicos', 'portfolio', 'depoimentos', 'faq', 'arquetipo_por_que_fazer', 'arquetipo_campos_form'].includes(key))
                val = JSON.stringify(Array.isArray(val) ? val : (typeof val === 'object' && val !== null ? val : []));
            if (['arquetipo_ativo', 'contato_form_ativo', 'site_em_manutencao'].includes(key)) val = !!val;
            sets.push(key + ' = $' + i++);
            values.push(val);
        }
        if (sets.length === 0) return await findByProfileItemId(profileItemId);
        values.push(profileItemId);
        const r = await client.query(
            'UPDATE site_items SET ' + sets.join(', ') + ', updated_at = NOW() WHERE profile_item_id = $' + i + ' RETURNING *',
            values
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getSlugForProfileItem(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT u.profile_slug FROM profile_items pi JOIN users u ON u.id = pi.user_id WHERE pi.id = $1',
            [profileItemId]
        );
        const row = r.rows[0];
        if (!row) return null;
        return { profile_slug: row.profile_slug, slug: row.profile_slug };
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

async function insertArquetipoLead(siteItemId, data) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `INSERT INTO arquetipo_leads (site_item_id, nome, email, whatsapp, instagram, arquetipo_resultado, arquetipo_scores)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *`,
            [
                siteItemId,
                data.nome || null,
                data.email || null,
                data.whatsapp || null,
                data.instagram || null,
                data.arquetipo_resultado || null,
                data.arquetipo_scores ? JSON.stringify(data.arquetipo_scores) : null
            ]
        );
        return r.rows[0];
    } finally {
        client.release();
    }
}

async function getArquetipoLeads(siteItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM arquetipo_leads WHERE site_item_id = $1 ORDER BY created_at DESC',
            [siteItemId]
        );
        return r.rows;
    } finally {
        client.release();
    }
}

module.exports = {
    findByProfileItemId,
    findBySlug,
    create,
    update,
    ensureOwnership,
    getSlugForProfileItem,
    insertArquetipoLead,
    getArquetipoLeads
};
