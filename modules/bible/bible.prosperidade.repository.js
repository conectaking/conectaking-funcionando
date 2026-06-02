const db = require('../../db');
const logger = require('../../utils/logger');

const FIELDS = [
    'titulo', 'decreto_entrada', 'fundamento_sagrado', 'diagnostico_escassez',
    'estrada_com_king', 'diretriz_ilustracao', 'mentalidade_travada', 'nova_mentalidade',
    'exercicio_fixacao', 'ie_chave', 'treino_negocios', 'treino_altar',
    'sentenca_ativacao', 'proximo_episodio', 'proverbs_ref', 'storytelling_fase',
    'content_source', 'published'
];

function rowToDto(row) {
    if (!row) return null;
    return {
        activation_number: row.activation_number,
        titulo: row.titulo || '',
        decreto_entrada: row.decreto_entrada || '',
        fundamento_sagrado: row.fundamento_sagrado || '',
        diagnostico_escassez: row.diagnostico_escassez || '',
        estrada_com_king: row.estrada_com_king || '',
        diretriz_ilustracao: row.diretriz_ilustracao || '',
        mentalidade_travada: row.mentalidade_travada || '',
        nova_mentalidade: row.nova_mentalidade || '',
        exercicio_fixacao: row.exercicio_fixacao || '',
        ie_chave: row.ie_chave || '',
        treino_negocios: row.treino_negocios || '',
        treino_altar: row.treino_altar || '',
        sentenca_ativacao: row.sentenca_ativacao || '',
        proximo_episodio: row.proximo_episodio || '',
        proverbs_ref: row.proverbs_ref || ('Provérbios ' + row.activation_number),
        storytelling_fase: row.storytelling_fase || row.activation_number,
        content_source: row.content_source || 'manual',
        published: !!row.published,
        updated_at: row.updated_at
    };
}

function trimField(v) {
    return v == null ? '' : String(v).trim();
}

function hasAnyContent(row) {
    if (!row) return false;
    const keys = FIELDS.filter((k) => k !== 'published' && k !== 'content_source' && k !== 'storytelling_fase');
    return keys.some((k) => trimField(row[k]));
}

function computeStatus(row) {
    if (!row) return 'vazio';
    if (row.published) return 'publicado';
    if (!hasAnyContent(row)) return 'vazio';
    const required = ['titulo', 'decreto_entrada', 'fundamento_sagrado', 'sentenca_ativacao'];
    const incomplete = required.some((k) => !trimField(row[k]));
    return incomplete ? 'incompleto' : 'rascunho';
}

async function getByNumber(n) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = $1',
            [n]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getPublishedByNumber(n) {
    const row = await getByNumber(n);
    if (!row || !row.published) return null;
    return rowToDto(row);
}

async function getNearestPublished(n, direction) {
    const client = await db.pool.connect();
    try {
        const dir = direction === 'prev' ? 'DESC' : 'ASC';
        const op = direction === 'prev' ? '<' : '>';
        const r = await client.query(
            `SELECT * FROM bible_prosperidade_ativacoes
             WHERE published = TRUE AND activation_number ${op} $1
             ORDER BY activation_number ${dir} LIMIT 1`,
            [n]
        );
        return r.rows[0] ? rowToDto(r.rows[0]) : null;
    } finally {
        client.release();
    }
}

async function listAll() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM bible_prosperidade_ativacoes ORDER BY activation_number ASC'
        );
        return r.rows.map((row) => ({
            activation_number: row.activation_number,
            titulo: trimField(row.titulo) || ('Ativação ' + row.activation_number),
            proverbs_ref: row.proverbs_ref || ('Provérbios ' + row.activation_number),
            published: !!row.published,
            status: computeStatus(row),
            updated_at: row.updated_at
        }));
    } finally {
        client.release();
    }
}

async function listPublishedSummary() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `SELECT activation_number, titulo, proverbs_ref, published
             FROM bible_prosperidade_ativacoes ORDER BY activation_number ASC`
        );
        return r.rows.map((row) => ({
            activation_number: row.activation_number,
            titulo: trimField(row.titulo) || ('Ativação ' + row.activation_number),
            proverbs_ref: row.proverbs_ref || ('Provérbios ' + row.activation_number),
            published: !!row.published
        }));
    } finally {
        client.release();
    }
}

async function updateActivation(n, data) {
    const client = await db.pool.connect();
    try {
        const sets = [];
        const values = [];
        let i = 1;
        for (const key of FIELDS) {
            if (!(key in data)) continue;
            let val = data[key];
            if (key === 'published') val = !!val;
            if (key === 'storytelling_fase' && val != null) val = parseInt(val, 10);
            sets.push(`${key} = $${i++}`);
            values.push(val);
        }
        if (sets.length === 0) return await getByNumber(n);
        sets.push('updated_at = NOW()');
        values.push(n);
        const r = await client.query(
            `UPDATE bible_prosperidade_ativacoes SET ${sets.join(', ')}
             WHERE activation_number = $${i} RETURNING *`,
            values
        );
        return r.rows[0] || null;
    } catch (err) {
        if (err && err.code === '22001') {
            const e = new Error('Um campo excede o tamanho permitido na base. Faça deploy da migration 231 e tente novamente.');
            e.code = err.code;
            throw e;
        }
        logger.error('bible.prosperidade.repository updateActivation:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function setPublished(n, published) {
    return updateActivation(n, { published: !!published });
}

async function exportAll() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM bible_prosperidade_ativacoes ORDER BY activation_number ASC'
        );
        return r.rows.map(rowToDto);
    } finally {
        client.release();
    }
}

async function importAll(items) {
    if (!Array.isArray(items)) throw new Error('JSON deve ser um array de Ativações.');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        let count = 0;
        for (const item of items) {
            const n = parseInt(item.activation_number, 10);
            if (n < 1 || n > 31) continue;
            const payload = {};
            for (const key of FIELDS) {
                if (key in item) payload[key] = item[key];
            }
            await updateActivationInClient(client, n, payload);
            count++;
        }
        await client.query('COMMIT');
        return { imported: count };
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('bible.prosperidade.repository importAll:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function updateActivationInClient(client, n, data) {
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of FIELDS) {
        if (!(key in data)) continue;
        let val = data[key];
        if (key === 'published') val = !!val;
        sets.push(`${key} = $${i++}`);
        values.push(val);
    }
    if (sets.length === 0) return;
    sets.push('updated_at = NOW()');
    values.push(n);
    await client.query(
        `UPDATE bible_prosperidade_ativacoes SET ${sets.join(', ')} WHERE activation_number = $${i}`,
        values
    );
}

async function markRead(data) {
    const { userId, visitorId, activationNumber, slug } = data;
    const n = parseInt(activationNumber, 10);
    if (n < 1 || n > 31) throw new Error('activation_number deve ser entre 1 e 31.');
    const client = await db.pool.connect();
    try {
        if (userId) {
            const ex = await client.query(
                'SELECT id FROM bible_prosperidade_reads WHERE user_id = $1 AND activation_number = $2',
                [userId, n]
            );
            if (ex.rows.length) {
                await client.query(
                    'UPDATE bible_prosperidade_reads SET read_at = NOW() WHERE user_id = $1 AND activation_number = $2',
                    [userId, n]
                );
            } else {
                await client.query(
                    'INSERT INTO bible_prosperidade_reads (user_id, activation_number, slug) VALUES ($1, $2, $3)',
                    [userId, n, slug || null]
                );
            }
        } else if (visitorId) {
            const ex = await client.query(
                'SELECT id FROM bible_prosperidade_reads WHERE visitor_id = $1 AND activation_number = $2',
                [visitorId, n]
            );
            if (ex.rows.length) {
                await client.query(
                    'UPDATE bible_prosperidade_reads SET read_at = NOW() WHERE visitor_id = $1 AND activation_number = $2',
                    [visitorId, n]
                );
            } else {
                await client.query(
                    'INSERT INTO bible_prosperidade_reads (visitor_id, activation_number, slug) VALUES ($1, $2, $3)',
                    [visitorId, n, slug || null]
                );
            }
        } else {
            throw new Error('user_id ou visitor_id obrigatório.');
        }
        return { activation_number: n, read: true };
    } catch (err) {
        logger.error('bible.prosperidade.repository markRead:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getReadStatus(userId, visitorId, numbers) {
    const client = await db.pool.connect();
    try {
        let nums = null;
        if (numbers != null && numbers !== '') {
            const arr = String(numbers).split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => x >= 1 && x <= 31);
            if (arr.length) nums = arr;
        }
        if (userId) {
            const q = nums
                ? 'SELECT activation_number, read_at FROM bible_prosperidade_reads WHERE user_id = $1 AND activation_number = ANY($2::int[])'
                : 'SELECT activation_number, read_at FROM bible_prosperidade_reads WHERE user_id = $1';
            const r = await client.query(q, nums ? [userId, nums] : [userId]);
            return r.rows;
        }
        if (visitorId) {
            const q = nums
                ? 'SELECT activation_number, read_at FROM bible_prosperidade_reads WHERE visitor_id = $1 AND activation_number = ANY($2::int[])'
                : 'SELECT activation_number, read_at FROM bible_prosperidade_reads WHERE visitor_id = $1';
            const r = await client.query(q, nums ? [visitorId, nums] : [visitorId]);
            return r.rows;
        }
        return [];
    } catch (err) {
        logger.error('bible.prosperidade.repository getReadStatus:', err);
        return [];
    } finally {
        client.release();
    }
}

module.exports = {
    rowToDto,
    computeStatus,
    hasAnyContent,
    getByNumber,
    getPublishedByNumber,
    getNearestPublished,
    listAll,
    listPublishedSummary,
    updateActivation,
    setPublished,
    exportAll,
    importAll,
    markRead,
    getReadStatus
};
