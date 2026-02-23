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

async function resetProgress(userId) {
    const client = await db.pool.connect();
    try {
        await client.query('DELETE FROM bible_reading_progress WHERE user_id = $1', [userId]);
        return await getProgress(userId);
    } catch (err) {
        logger.error('bible.repository resetProgress:', err);
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

// --- Devocional: marcar como lido (visitante ou usuário) ---

async function markDevotionalRead(data) {
    const { userId, visitorId, dayOfYear, userNote, slug } = data || {};
    const day = parseInt(dayOfYear, 10);
    if (!day || day < 1 || day > 365) throw new Error('day_of_year deve ser entre 1 e 365');
    if (!userId && !visitorId) throw new Error('Informe user_id (logado) ou visitor_id');

    const client = await db.pool.connect();
    try {
        if (userId) {
            const existing = await client.query(
                'SELECT id FROM bible_devotional_reads WHERE user_id = $1 AND day_of_year = $2',
                [userId, day]
            );
            if (existing.rows.length > 0) {
                await client.query(
                    'UPDATE bible_devotional_reads SET read_at = NOW(), user_note = COALESCE($3, user_note) WHERE user_id = $1 AND day_of_year = $2',
                    [userId, day, userNote || null]
                );
            } else {
                await client.query(
                    'INSERT INTO bible_devotional_reads (user_id, day_of_year, user_note, slug) VALUES ($1, $2, $3, $4)',
                    [userId, day, userNote || null, slug || null]
                );
            }
        } else {
            const vid = String(visitorId).slice(0, 64);
            if (!vid) throw new Error('visitor_id não pode ser vazio');
            const existing = await client.query(
                'SELECT id FROM bible_devotional_reads WHERE visitor_id = $1 AND day_of_year = $2',
                [vid, day]
            );
            if (existing.rows.length > 0) {
                await client.query(
                    'UPDATE bible_devotional_reads SET read_at = NOW(), user_note = COALESCE($3, user_note) WHERE visitor_id = $1 AND day_of_year = $2',
                    [vid, day, userNote || null]
                );
            } else {
                await client.query(
                    'INSERT INTO bible_devotional_reads (visitor_id, day_of_year, user_note, slug) VALUES ($1, $2, $3, $4)',
                    [vid, day, userNote || null, slug || null]
                );
            }
        }
        return { success: true, day_of_year: day };
    } catch (err) {
        logger.error('bible.repository markDevotionalRead:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getReadingPlanDay(dayNumber) {
    const client = await db.pool.connect();
    try {
        const day = parseInt(dayNumber, 10);
        if (day < 1 || day > 365) return null;
        const r = await client.query(
            'SELECT * FROM bible_reading_plan_days WHERE day_number = $1',
            [day]
        );
        return r.rows[0] || null;
    } catch (err) {
        logger.error('bible.repository getReadingPlanDay:', err);
        return null;
    } finally {
        client.release();
    }
}

async function getReadingPlanList() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT day_number, book_id, chapter_from, chapter_to, verse_count FROM bible_reading_plan_days ORDER BY day_number'
        );
        return r.rows;
    } catch (err) {
        logger.error('bible.repository getReadingPlanList:', err);
        return [];
    } finally {
        client.release();
    }
}

// --- Estudo por livro/capítulo ---
/** Lista de book_id que possuem estudo completo do livro (bible_book_studies). */
async function getBookIdsWithFullStudy() {
    const client = await db.pool.connect();
    try {
        const r = await client.query('SELECT DISTINCT book_id FROM bible_book_studies ORDER BY book_id');
        return r.rows.map(row => row.book_id);
    } catch (err) {
        logger.error('bible.repository getBookIdsWithFullStudy:', err);
        return [];
    } finally {
        client.release();
    }
}

async function getStudyBooksList() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(`
            SELECT DISTINCT book_id FROM (
                SELECT book_id FROM bible_book_studies
                UNION
                SELECT book_id FROM bible_chapter_studies
            ) t ORDER BY book_id
        `);
        return r.rows.map(row => row.book_id);
    } catch (err) {
        logger.error('bible.repository getStudyBooksList:', err);
        return [];
    } finally {
        client.release();
    }
}

async function getBookStudy(bookId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT book_id, title, content FROM bible_book_studies WHERE book_id = $1',
            [bookId]
        );
        return r.rows[0] || null;
    } catch (err) {
        logger.error('bible.repository getBookStudy:', err);
        return null;
    } finally {
        client.release();
    }
}

async function getChapterStudy(bookId, chapterNumber) {
    const client = await db.pool.connect();
    try {
        const num = parseInt(chapterNumber, 10);
        if (num < 1) return null;
        const r = await client.query(
            'SELECT book_id, chapter_number, title, content FROM bible_chapter_studies WHERE book_id = $1 AND chapter_number = $2',
            [bookId, num]
        );
        return r.rows[0] || null;
    } catch (err) {
        logger.error('bible.repository getChapterStudy:', err);
        return null;
    } finally {
        client.release();
    }
}

async function getChapterStudiesByBook(bookId) {
    const client = await db.pool.connect();
    try {
        const r = await client.query(
            'SELECT chapter_number, title FROM bible_chapter_studies WHERE book_id = $1 ORDER BY chapter_number',
            [bookId]
        );
        return r.rows;
    } catch (err) {
        logger.error('bible.repository getChapterStudiesByBook:', err);
        return [];
    } finally {
        client.release();
    }
}

/** Cria ou atualiza o estudo do livro (bible_book_studies). Usado pelo admin ao importar Word/PDF. */
async function upsertBookStudy(bookId, title, content) {
    const client = await db.pool.connect();
    try {
        const safeBookId = String(bookId || '').trim();
        const safeTitle = title != null ? String(title).trim() || null : null;
        const safeContent = content != null ? String(content) : '';
        if (!safeBookId) throw new Error('book_id é obrigatório');
        const r = await client.query(
            `INSERT INTO bible_book_studies (book_id, title, content, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             ON CONFLICT (book_id) DO UPDATE SET title = COALESCE(EXCLUDED.title, bible_book_studies.title), content = EXCLUDED.content, updated_at = NOW()
             RETURNING id, book_id, title, updated_at`,
            [safeBookId, safeTitle || null, safeContent]
        );
        return r.rows[0] || null;
    } catch (err) {
        logger.error('bible.repository upsertBookStudy:', err);
        throw err;
    } finally {
        client.release();
    }
}

/** Remove o estudo do livro (bible_book_studies). Usado pelo admin para limpar estudos. */
async function deleteBookStudy(bookId) {
    const client = await db.pool.connect();
    try {
        const safeBookId = String(bookId || '').trim();
        if (!safeBookId) throw new Error('book_id é obrigatório');
        const r = await client.query('DELETE FROM bible_book_studies WHERE book_id = $1 RETURNING book_id', [safeBookId]);
        return r.rowCount > 0;
    } catch (err) {
        logger.error('bible.repository deleteBookStudy:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getDevotionalReadStatus(userId, visitorId, days) {
    const client = await db.pool.connect();
    try {
        let dayList = [];
        if (days) {
            const parts = String(days).split(',').map(d => parseInt(d, 10)).filter(d => d >= 1 && d <= 365);
            dayList = [...new Set(parts)];
        }
        if (userId) {
            const r = dayList.length > 0
                ? await client.query(
                    'SELECT day_of_year, read_at, user_note FROM bible_devotional_reads WHERE user_id = $1 AND day_of_year = ANY($2::int[])',
                    [userId, dayList]
                )
                : await client.query(
                    'SELECT day_of_year, read_at, user_note FROM bible_devotional_reads WHERE user_id = $1',
                    [userId]
                );
            return r.rows.map(row => ({ day_of_year: row.day_of_year, read_at: row.read_at, user_note: row.user_note }));
        }
        if (visitorId) {
            const vid = String(visitorId).slice(0, 64);
            const r = dayList.length > 0
                ? await client.query(
                    'SELECT day_of_year, read_at, user_note FROM bible_devotional_reads WHERE visitor_id = $1 AND day_of_year = ANY($2::int[])',
                    [vid, dayList]
                )
                : await client.query(
                    'SELECT day_of_year, read_at, user_note FROM bible_devotional_reads WHERE visitor_id = $1',
                    [vid]
                );
            return r.rows.map(row => ({ day_of_year: row.day_of_year, read_at: row.read_at, user_note: row.user_note }));
        }
        return [];
    } catch (err) {
        logger.error('bible.repository getDevotionalReadStatus:', err);
        return [];
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
    resetProgress,
    getDevocional365,
    getStudyThemes,
    getStudies,
    getStudyBySlug,
    getOutlineCategories,
    getOutlines,
    getOutlineBySlug,
    searchBibleEcosystem,
    markDevotionalRead,
    getDevotionalReadStatus,
    getReadingPlanDay,
    getReadingPlanList,
    getBookIdsWithFullStudy,
    getStudyBooksList,
    getBookStudy,
    getChapterStudy,
    getChapterStudiesByBook,
    upsertBookStudy,
    deleteBookStudy
};
