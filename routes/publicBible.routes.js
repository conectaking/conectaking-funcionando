/**
 * Rotas públicas do módulo Bíblia
 * GET /:slug/bible - Página principal (versículo do dia, livros)
 * GET /:slug/bible/:bookId/:chapter - Leitor de capítulo
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../db');
const logger = require('../utils/logger');
const bibleService = require('../modules/bible/bible.service');

router.get('/:slug/bible/:bookId/:chapter', asyncHandler(async (req, res) => {
    const { slug, bookId, chapter } = req.params;
    try {
        const client = await db.pool.connect();
        try {
            const userRes = await client.query(
                `SELECT id FROM users WHERE LOWER(profile_slug) = LOWER($1) LIMIT 1`,
                [slug]
            );
            if (userRes.rows.length === 0) {
                return res.status(404).send('<h1>Bíblia não encontrada</h1>');
            }
            const itemRes = await client.query(
                `SELECT bi.translation_code FROM profile_items pi
                 LEFT JOIN bible_items bi ON bi.profile_item_id = pi.id
                 WHERE pi.user_id = $1 AND pi.item_type = 'bible' AND pi.is_active = true LIMIT 1`,
                [userRes.rows[0].id]
            );
            const translation = (req.query.translation || itemRes.rows[0]?.translation_code || 'nvi').toLowerCase();
            const chapterData = bibleService.getBookChapter(bookId, chapter, translation);
            if (!chapterData) {
                return res.status(404).send('<h1>Capítulo não encontrado</h1>');
            }
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const tParam = translation !== 'nvi' ? '?translation=' + encodeURIComponent(translation) : '';
            res.render('bibleReader', {
                slug,
                translation,
                chapterData,
                baseUrl,
                tParam,
                API_URL: process.env.FRONTEND_URL || baseUrl
            });
        } finally {
            client.release();
        }
    } catch (e) {
        logger.error('publicBible reader:', e);
        res.status(500).send('<h1>Erro ao carregar capítulo</h1>');
    }
}));

router.get('/:slug/bible', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    try {
        const client = await db.pool.connect();
        try {
            const userRes = await client.query(
                `SELECT id FROM users WHERE LOWER(profile_slug) = LOWER($1) LIMIT 1`,
                [slug]
            );
            if (userRes.rows.length === 0) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html><head><meta charset="utf-8"><title>Bíblia não encontrada</title></head>
                    <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
                        <h1>Bíblia não encontrada</h1>
                        <p>O link pode estar incorreto ou o módulo foi desativado.</p>
                    </body></html>
                `);
            }
            const itemRes = await client.query(
                `SELECT pi.id, bi.translation_code
                 FROM profile_items pi
                 LEFT JOIN bible_items bi ON bi.profile_item_id = pi.id
                 WHERE pi.user_id = $1 AND pi.item_type = 'bible' AND pi.is_active = true
                 LIMIT 1`,
                [userRes.rows[0].id]
            );
            if (itemRes.rows.length === 0) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html><head><meta charset="utf-8"><title>Bíblia não encontrada</title></head>
                    <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
                        <h1>Bíblia não encontrada</h1>
                        <p>Este perfil não possui o módulo Bíblia ativo.</p>
                    </body></html>
                `);
            }
            const trans = (req.query.translation || itemRes.rows[0].translation_code || 'nvi').toLowerCase();
            const tParam = trans !== 'nvi' ? '?translation=' + encodeURIComponent(trans) : '';
            return res.redirect(302, `/${slug}/bible/gn/1${tParam}`);
        } finally {
            client.release();
        }
    } catch (e) {
        logger.error('publicBible:', e);
        res.status(500).send('<h1>Erro ao carregar Bíblia</h1>');
    }
}));

module.exports = router;
