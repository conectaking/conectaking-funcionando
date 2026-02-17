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

module.exports = {
    findByProfileItemId,
    create,
    update,
    ensureOwnership,
    getProgress,
    markRead
};
