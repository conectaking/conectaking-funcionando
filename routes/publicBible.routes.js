/**
 * Rotas públicas do módulo Bíblia
 * GET /:slug/bible - Página principal (versículo do dia, livros)
 * GET /:slug/biblia/estudos-livro/:bookId - Estudo do livro (URL limpa; antiga /bible/estudo-livro/:bookId redireciona)
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
        bibleItemId: itemRes.rows[0].id || null,
        baseUrl: null,
        API_URL: null
    };
}

/** URL antiga: redireciona para a URL limpa /biblia/estudos-livro/:bookId */
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

router.get('/:slug/bible/estudo-livro/:bookId', (req, res) => {
    res.redirect(302, `/${req.params.slug}/biblia/estudos-livro/${encodeURIComponent(req.params.bookId)}`);
});

/** Escapa HTML e opcionalmente transforma referências Gn/Gênesis em links para o leitor. */
function prepareStudyContent(raw, baseUrl, slug, bookId, returnTo) {
    if (!raw || typeof raw !== 'string') return '';
    const escape = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    let out = escape(raw).replace(/\n/g, '<br>');
    if ((bookId || '').toLowerCase() === 'gn') {
        const base = (baseUrl || '').replace(/\/$/, '') + '/' + (slug || '') + '/bible/gn/';
        const returnQ = returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '';
        out = out.replace(/\b(?:Gn|Gênesis)\s*(\d+)(?::(\d+))?(?:[–-]\d+)?(?:\s*[–-]\s*\d+(?::\d+(?:[–-]\d+)?)?)?\b/g, (match) => {
            const m = match.match(/(\d+)(?::(\d+))?/);
            const ch = m[1];
            const v = m[2] || '';
            const href = base + ch + (v ? '#v' + v : '') + returnQ;
            return '<a href="' + href + '" class="bible-ref-link" target="_blank" rel="noopener">' + match + '</a>';
        });
    }
    return out;
}

/** Renderiza estudo do livro. URL limpa: /:slug/biblia/estudos-livro/:bookId */
async function renderBookStudy(req, res, slug, bookId) {
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
        const base = baseUrl.replace(/\/$/, '');
        const manifest = bibleService.loadBooksManifest();
        const allBooks = (manifest.at || []).concat(manifest.nt || []);
        const book = allBooks.find(b => b && b.id === bookId);
        const bookName = book ? (book.name || bookId) : bookId;
        const study = await bibleService.getBookStudy(bookId);
        const frontendUrl = (process.env.FRONTEND_URL || process.env.API_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
        const bibleItemId = ctx.bibleItemId || null;
        const biblePanelUrl = bibleItemId ? `${frontendUrl}/bibliaking.html?itemId=${bibleItemId}` : `${frontendUrl}/dashboard.html`;
        const returnTo = base + '/' + slug + '/biblia/estudos-livro/' + encodeURIComponent(bookId || '');
        const contentSafe = study && study.content
            ? prepareStudyContent(study.content, base, slug, bookId, returnTo)
            : '';
        return res.render('bibleBookStudy', {
            slug: ctx.slug,
            bookId: bookId || '',
            bookName,
            study: study ? { ...study, contentSafe } : null,
            baseUrl: base,
            biblePanelUrl,
            returnTo
        });
    } finally {
        client.release();
    }
}

router.get('/:slug/biblia/estudos-livro', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || process.env.API_URL || 'https://www.conectaking.com.br';
    res.redirect(302, frontendUrl.replace(/\/$/, '') + '/dashboard.html');
});

router.get('/:slug/biblia/estudos-livro/:bookId', asyncHandler(async (req, res) => {
    const { slug, bookId } = req.params;
    try {
        await renderBookStudy(req, res, slug, bookId);
    } catch (e) {
        logger.error('publicBible estudos-livro:', e);
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
            const biblePanelUrl = bibleItemId ? `${frontendUrl}/bibliaking.html?itemId=${bibleItemId}` : `${baseUrl}/${slug}/bible/gn/1`;
            const returnTo = (req.query.returnTo && typeof req.query.returnTo === 'string') ? req.query.returnTo : '';
            const jesusVerseNumbers = bibleService.getJesusVerseNumbersForChapter(bookId, chapter);
            res.render('bibleReader', {
                slug,
                translation,
                chapterData,
                baseUrl,
                tParam,
                biblePanelUrl,
                returnTo,
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

/**
 * Página principal /:slug/bible desativada como conteúdo único — redireciona para o leitor (Gênesis 1)
 * para que links antigos e o cartão público abram a Bíblia corretamente.
 */
router.get('/:slug/bible', (req, res) => {
    const slug = req.params.slug;
    res.redirect(302, `/${encodeURIComponent(slug)}/bible/gn/1`);
});

module.exports = router;
