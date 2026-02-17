const db = require('../../db');
const logger = require('../../utils/logger');

async function findByProfileItemId(profileItemId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM bible_items WHERE profile_item_id = $1',
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
            `INSERT INTO bible_items (profile_item_id, translation_code, is_visible)
             VALUES ($1, 'nvi', true) RETURNING *`,
            [profileItemId]
        );
        return r.rows[0];
    } catch (err) {
        logger.error('bible.repository create:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function update(profileItemId, data) {
    const client = await db.pool.connect();
    try {
        const allowed = ['translation_code', 'voice_id', 'is_visible'];
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
            `UPDATE bible_items SET ${sets.join(', ')}, updated_at = NOW() WHERE profile_item_id = $${i} RETURNING *`,
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

async function getProgress(userId) {
    const client = await db.pool.connect();
    try {
        const versesRes = await client.query(
            'SELECT COUNT(*) as n FROM bible_reading_progress WHERE user_id = $1 AND mode = $2',
            [userId, 'read']
        );
        const chaptersRes = await client.query(
            `SELECT COUNT(*) as n FROM (
                SELECT DISTINCT book, chapter FROM bible_reading_progress 
                WHERE user_id = $1 AND mode = $2
            ) sub`,
            [userId, 'read']
        );
        const booksRes = await client.query(
            'SELECT COUNT(DISTINCT book) as n FROM bible_reading_progress WHERE user_id = $1 AND mode = $2',
            [userId, 'read']
        );
        const verses = parseInt(versesRes.rows[0]?.n || 0, 10);
        const chapters = parseInt(chaptersRes.rows[0]?.n || 0, 10);
        const books = parseInt(booksRes.rows[0]?.n || 0, 10);
        const totalBooks = 66;
        const totalChapters = 1189;
        const totalVerses = 31102;
        return {
            books_read: books,
            chapters_read: chapters,
            verses_read: verses,
            total_books: totalBooks,
            total_chapters: totalChapters,
            total_verses: totalVerses,
            percent_books: Math.round(books / totalBooks * 100),
            percent_chapters: Math.round(chapters / totalChapters * 100),
            percent_verses: Math.round(verses / totalVerses * 100)
        };
    } catch (err) {
        logger.error('bible.repository getProgress:', err);
        return { books_read: 0, chapters_read: 0, verses_read: 0, total_books: 66, total_chapters: 1189, total_verses: 31102, percent_books: 0, percent_chapters: 0, percent_verses: 0 };
    } finally {
        client.release();
    }
}

async function markRead(userId, data) {
    const client = await db.pool.connect();
    try {
        const { book, chapter, verse, mode = 'read' } = data || {};
        if (!book || !chapter) throw new Error('book e chapter são obrigatórios');
        try {
            await client.query(
                `INSERT INTO bible_reading_progress (user_id, book, chapter, verse, mode)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, String(book), parseInt(chapter, 10) || 0, verse ? parseInt(verse, 10) : null, mode]
            );
        } catch (insErr) {
            if (insErr.code !== '23505') throw insErr;
        }
        return await getProgress(userId);
    } catch (err) {
        logger.error('bible.repository markRead:', err);
        throw err;
    } finally {
        client.release();
    }
}

// --- Ecossistema Bíblico (devocionais 365, estudos, esboços) ---

async function getDevocional365(dayOfYear) {
    const client = await db.pool.connect();
    try {
        const day = parseInt(dayOfYear, 10);
        if (day < 1 || day > 365) return null;
        const r = await client.query(
            'SELECT * FROM bible_devotionals_365 WHERE day_of_year = $1',
            [day]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getStudyThemes() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM bible_study_themes ORDER BY display_order, nome'
        );
        return r.rows;
    } finally {
        client.release();
    }
}

async function getStudies(themeSlug) {
    const client = await db.pool.connect();
    try {
        let q = `
            SELECT s.*, t.nome as theme_name, t.slug as theme_slug
            FROM bible_studies s
            JOIN bible_study_themes t ON t.id = s.theme_id
        `;
        const params = [];
        if (themeSlug) {
            q += ' WHERE t.slug = $1';
            params.push(themeSlug);
        }
        q += ' ORDER BY s.display_order, s.titulo';
        const r = await client.query(q, params);
        return r.rows;
    } finally {
        client.release();
    }
}

async function getStudyBySlug(themeSlug, studySlug) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `SELECT s.*, t.nome as theme_name, t.slug as theme_slug
             FROM bible_studies s
             JOIN bible_study_themes t ON t.id = s.theme_id
             WHERE t.slug = $1 AND s.slug = $2`,
            [themeSlug, studySlug]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function getOutlineCategories() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT * FROM sermon_outline_categories ORDER BY display_order, nome'
        );
        return r.rows;
    } finally {
        client.release();
    }
}

async function getOutlines(categorySlug) {
    const client = await db.pool.connect();
    try {
        let q = `
            SELECT o.*, c.nome as category_name, c.slug as category_slug
            FROM sermon_outlines o
            JOIN sermon_outline_categories c ON c.id = o.category_id
        `;
        const params = [];
        if (categorySlug) {
            q += ' WHERE c.slug = $1';
            params.push(categorySlug);
        }
        q += ' ORDER BY o.display_order, o.titulo';
        const r = await client.query(q, params);
        return r.rows;
    } finally {
        client.release();
    }
}

async function getOutlineBySlug(categorySlug, outlineSlug) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            `SELECT o.*, c.nome as category_name, c.slug as category_slug
             FROM sermon_outlines o
             JOIN sermon_outline_categories c ON c.id = o.category_id
             WHERE c.slug = $1 AND o.slug = $2`,
            [categorySlug, outlineSlug]
        );
        return r.rows[0] || null;
    } finally {
        client.release();
    }
}

async function searchBibleEcosystem(query, limit = 30) {
    const client = await db.pool.connect();
    try {
        const q = (query || '').trim();
        if (!q || q.length < 2) return { devotionals: [], studies: [], outlines: [] };

        const term = '%' + q.replace(/\s+/g, '%') + '%';
        const likeTerm = term;
        const limitNum = Math.min(parseInt(limit, 10) || 30, 50);

        const [devR, studR, outR] = await Promise.all([
            client.query(
                `SELECT id, day_of_year, titulo, versiculo_ref, LEFT(reflexao, 200) as reflexao_preview
                 FROM bible_devotionals_365
                 WHERE search_vector @@ plainto_tsquery('portuguese', $1)
                    OR titulo ILIKE $2 OR versiculo_ref ILIKE $2 OR reflexao ILIKE $2 OR aplicacao ILIKE $2
                 ORDER BY ts_rank(search_vector, plainto_tsquery('portuguese', $1)) DESC NULLS LAST
                 LIMIT $3`,
                [q, likeTerm, limitNum]
            ).catch(() => ({ rows: [] })),
            client.query(
                `SELECT s.id, s.slug, s.titulo, t.slug as theme_slug, t.nome as theme_name, LEFT(s.conteudo, 200) as preview
                 FROM bible_studies s
                 JOIN bible_study_themes t ON t.id = s.theme_id
                 WHERE s.search_vector @@ plainto_tsquery('portuguese', $1)
                    OR s.titulo ILIKE $2 OR s.conteudo ILIKE $2 OR s.introducao ILIKE $2
                 ORDER BY ts_rank(s.search_vector, plainto_tsquery('portuguese', $1)) DESC NULLS LAST
                 LIMIT $3`,
                [q, likeTerm, limitNum]
            ).catch(() => ({ rows: [] })),
            client.query(
                `SELECT o.id, o.slug, o.titulo, c.slug as category_slug, c.nome as category_name, LEFT(o.introducao, 200) as preview
                 FROM sermon_outlines o
                 JOIN sermon_outline_categories c ON c.id = o.category_id
                 WHERE o.search_vector @@ plainto_tsquery('portuguese', $1)
                    OR o.titulo ILIKE $2 OR o.introducao ILIKE $2 OR o.conclusao ILIKE $2 OR o.apelo ILIKE $2
                    OR o.topicos::text ILIKE $2
                 ORDER BY ts_rank(o.search_vector, plainto_tsquery('portuguese', $1)) DESC NULLS LAST
                 LIMIT $3`,
                [q, likeTerm, limitNum]
            ).catch(() => ({ rows: [] }))
        ]);

        return {
            devotionals: devR.rows,
            studies: studR.rows,
            outlines: outR.rows
        };
    } catch (err) {
        logger.error('bible.repository searchBibleEcosystem:', err);
        return { devotionals: [], studies: [], outlines: [] };
    } finally {
        client.release();
    }
}

module.exports = {
    findByProfileItemId,
    create,
    update,
    ensureOwnership,
    getProgress,
    markRead,
    getDevocional365,
    getStudyThemes,
    getStudies,
    getStudyBySlug,
    getOutlineCategories,
    getOutlines,
    getOutlineBySlug,
    searchBibleEcosystem
};
