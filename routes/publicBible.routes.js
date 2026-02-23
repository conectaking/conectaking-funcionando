/**
 * Rotas públicas do módulo Bíblia
 * GET /:slug/bible - Página principal (versículo do dia, livros)
 * GET /:slug/bible/estudo-livro/:bookId - Página principal com estudo do livro aberto (evita confundir com bookId/chapter)
 * GET /:slug/bible/:bookId/:chapter - Leitor de capítulo
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../db');
const logger = require('../utils/logger');
const bibleService = require('../modules/bible/bible.service');

/** Renderiza a página da Bíblia (biblePublic) com os dados do perfil. */
async function getBiblePageContext(client, slug) {
    const userRes = await client.query(
        `SELECT id FROM users WHERE LOWER(profile_slug) = LOWER($1) LIMIT 1`,
        [slug]
    );
    if (userRes.rows.length === 0) return null;
    const itemRes = await client.query(
        `SELECT pi.id, bi.translation_code
         FROM profile_items pi
         LEFT JOIN bible_items bi ON bi.profile_item_id = pi.id
         WHERE pi.user_id = $1 AND pi.item_type = 'bible' AND pi.is_active = true
         LIMIT 1`,
        [userRes.rows[0].id]
    );
    if (itemRes.rows.length === 0) return null;
    return {
        slug,
        translation: itemRes.rows[0].translation_code || 'nvi',
        baseUrl: null,
        API_URL: null
    };
}

/** URL sem bookId desativada: página duplicada. Retorna 404 e link para o painel. */
router.get('/:slug/bible/estudo-livro', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || process.env.API_URL || 'https://www.conectaking.com.br';
    const dashboardUrl = frontendUrl.replace(/\/$/, '') + '/dashboard.html';
    res.status(404).send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Página não disponível</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
            <h1>Página não disponível</h1>
            <p>Abra o painel e acesse a Bíblia por lá.</p>
            <p style="margin-top:20px"><a href="${dashboardUrl}" style="color:#FFC700;text-decoration:none;font-weight:600">Abrir painel →</a></p>
        </body></html>
    `);
});

router.get('/:slug/bible/estudo-livro/:bookId', asyncHandler(async (req, res) => {
    const { slug, bookId } = req.params;
    try {
        const client = await db.pool.connect();
        try {
            const ctx = await getBiblePageContext(client, slug);
            if (!ctx) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html><head><meta charset="utf-8"><title>Bíblia não encontrada</title></head>
                    <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
                        <h1>Bíblia não encontrada</h1>
                        <p>Este perfil não possui o módulo Bíblia ativo.</p>
                    </body></html>
                `);
            }
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const manifest = bibleService.loadBooksManifest();
            const allBooks = (manifest.at || []).concat(manifest.nt || []);
            const book = allBooks.find(b => b && b.id === bookId);
            const bookName = book ? (book.name || bookId) : bookId;
            const study = await bibleService.getBookStudy(bookId);
            const frontendUrl = process.env.FRONTEND_URL || process.env.API_URL || 'https://www.conectaking.com.br';
            const biblePanelUrl = frontendUrl.replace(/\/$/, '') + '/dashboard.html';
            let returnTo = (req.query.returnTo && typeof req.query.returnTo === 'string') ? req.query.returnTo.trim() : '';
            if (returnTo) {
              const baseUrlReq = (req.protocol + '://' + (req.get('host') || '')).replace(/\/$/, '');
              const frontBase = (frontendUrl || '').replace(/\/$/, '');
              const allowed = (frontBase && returnTo.indexOf(frontBase) === 0) || (baseUrlReq && returnTo.indexOf(baseUrlReq) === 0);
              if (!allowed) returnTo = '';
            }
            return res.render('bibleBookStudy', {
                slug: ctx.slug,
                bookId: bookId || '',
                bookName,
                study: study || null,
                baseUrl: baseUrl.replace(/\/$/, ''),
                biblePanelUrl,
                returnTo
            });
        } finally {
            client.release();
        }
    } catch (e) {
        logger.error('publicBible estudo-livro:', e);
        res.status(500).send('<h1>Erro ao carregar estudo</h1>');
    }
}));

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
                `SELECT pi.id, bi.translation_code FROM profile_items pi
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
            const bibleItemId = itemRes.rows[0]?.id || null;
            const frontendUrl = (process.env.FRONTEND_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
            const biblePanelUrl = bibleItemId ? `${frontendUrl}/bible.html?itemId=${bibleItemId}` : `${baseUrl}/${slug}/bible/gn/1`;
            const jesusVerseNumbers = bibleService.getJesusVerseNumbersForChapter(bookId, chapter);
            res.render('bibleReader', {
                slug,
                translation,
                chapterData,
                baseUrl,
                tParam,
                biblePanelUrl,
                API_URL: process.env.FRONTEND_URL || baseUrl,
                jesusVerseNumbers: jesusVerseNumbers || []
            });
        } finally {
            client.release();
        }
    } catch (e) {
        logger.error('publicBible reader:', e);
        res.status(500).send('<h1>Erro ao carregar capítulo</h1>');
    }
}));

/** Página pública da Bíblia (dashboard) desativada: usar apenas a página principal no painel. */
router.get('/:slug/bible', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || process.env.API_URL || 'https://www.conectaking.com.br';
    const dashboardUrl = frontendUrl.replace(/\/$/, '') + '/dashboard.html';
    res.status(404).send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Página não disponível</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
            <h1>Página não disponível</h1>
            <p>Esta página da Bíblia foi desativada. Abra o painel e acesse a Bíblia por lá.</p>
            <p style="margin-top:20px"><a href="${dashboardUrl}" style="color:#FFC700;text-decoration:none;font-weight:600">Abrir painel →</a></p>
        </body></html>
    `);
});

module.exports = router;
