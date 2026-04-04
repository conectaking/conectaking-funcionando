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

/** Base URL do frontend (painel). Em localhost/127.0.0.1 usa /public_html/ para Live Server. */
function getFrontendBase() {
    return (process.env.FRONTEND_URL || process.env.API_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
}

/** Menu inicial Conecta King (dashboard.html) — não o perfil público. */
function getDashboardHtmlUrl() {
    return `${getFrontendBase()}/dashboard.html`;
}

/** Retorna true se a base for ambiente local (Live Server, etc.). */
function isLocalFrontend(baseUrl) {
    try {
        const u = new URL(baseUrl);
        return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
    } catch (_) {
        return false;
    }
}

/**
 * URL “painel” da Bíblia = página pública /:slug/biblia (versículo do dia, livros, devocionais).
 * Sem slug no contexto: /bible.html?itemId= (o servidor redireciona para /slug/biblia).
 */
function getBiblePanelUrl(itemId, req, slugParam) {
    let base;
    if (req && typeof req.get === 'function' && req.protocol) {
        try {
            base = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
        } catch (_) {
            base = getFrontendBase();
        }
    } else {
        base = getFrontendBase();
    }
    const dashPath = isLocalFrontend(base) ? 'public_html/dashboard.html' : 'dashboard.html';
    const slug = slugParam || (req && req.params && req.params.slug);
    if (slug) {
        return `${base}/${encodeURIComponent(slug)}/biblia`;
    }
    if (itemId) {
        return `${base}/bible.html?itemId=${encodeURIComponent(itemId)}`;
    }
    return `${base}/${dashPath}`;
}

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

/** Painel /bible.html: definido em server.js antes do static (prioridade sobre ficheiros em public_html). */

/** URL antiga: redireciona para a URL limpa /biblia/estudos-livro/:bookId */
router.get('/:slug/bible/estudo-livro', (req, res) => {
    const dashboardUrl = getBiblePanelUrl(null, req);
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

/** Escapa HTML e transforma "Nome do livro + capítulo" em links (todos os livros do manifest). */
function prepareStudyContent(raw, baseUrl, slug, bookId, returnTo) {
    if (!raw || typeof raw !== 'string') return '';
    const escape = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    let out = escape(raw).replace(/\n/g, '<br>');
    const manifest = bibleService.loadBooksManifest();
    const allBooks = (manifest.at || []).concat(manifest.nt || []).filter((b) => b && b.id && b.name);
    if (!allBooks.length) return out;
    const sorted = [...allBooks].sort((a, b) => String(b.name).length - String(a.name).length);
    const nameToId = {};
    sorted.forEach((b) => {
        nameToId[String(b.name).toLowerCase()] = b.id;
    });
    const parts = sorted.map((b) => String(b.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    let alternation;
    try {
        alternation = parts.join('|');
    } catch (_) {
        return out;
    }
    if (!alternation) return out;
    const re = new RegExp('\\b(' + alternation + ')\\s+(\\d+)(?::(\\d+))?', 'gi');
    const base = (baseUrl || '').replace(/\/$/, '');
    const returnQ = returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '';
    out = out.replace(re, (match, bookName, ch, verseNum) => {
        const id = nameToId[String(bookName).toLowerCase()];
        if (!id) return match;
        const v = verseNum || '';
        const href = base + '/' + slug + '/bible/' + id + '/' + ch + (v ? '#v' + v : '') + returnQ;
        return '<a href="' + href + '" class="bible-ref-link" target="_blank" rel="noopener">' + match + '</a>';
    });
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
        const bibleItemId = ctx.bibleItemId || null;
        const biblePanelUrl = getBiblePanelUrl(bibleItemId, req, ctx.slug);
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
            dashboardUrl: getDashboardHtmlUrl(),
            returnTo
        });
    } finally {
        client.release();
    }
}

/** Página principal da Bíblia pública (hub): versículo do dia, receba mais, livros, estudos — sem login. */
router.get('/:slug/biblia', asyncHandler(async (req, res) => {
    const { slug } = req.params;
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
        const apiBaseForClient = (process.env.API_URL || baseUrl).replace(/\/$/, '');
        const booksManifest = bibleService.loadBooksManifest();
        const frontendBase = getFrontendBase();
        const isLocal = isLocalFrontend(frontendBase);
        const ttsScriptSrc = frontendBase + (isLocal ? '/public_html/js/tts.js' : '/js/tts.js');
        res.render('biblePublic', {
            slug: ctx.slug,
            translation: ctx.translation || 'nvi',
            booksManifest,
            baseUrl,
            API_URL: apiBaseForClient,
            ttsScriptSrc,
            initialEstudoBookId: null,
            dashboardUrl: getDashboardHtmlUrl(),
            profilePublicUrl: `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(ctx.slug)}`,
            cunhaDevotionalUrl: (process.env.BIBLE_CUNHA_URL || '').trim(),
            bibleAiAssistantUrl: (process.env.BIBLE_AI_URL || '').trim()
        });
    } finally {
        client.release();
    }
}));

router.get('/:slug/biblia/estudos-livro', (req, res) => {
    res.redirect(302, getBiblePanelUrl(null, req));
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
            const apiBaseForClient = (process.env.API_URL || baseUrl).replace(/\/$/, '');
            const tParam = translation !== 'nvi' ? '?translation=' + encodeURIComponent(translation) : '';
            const bibleItemId = itemRes.rows[0]?.id || null;
            const biblePanelUrl = bibleItemId ? getBiblePanelUrl(bibleItemId, req, slug) : `${baseUrl}/${slug}/biblia`;
            const returnTo = (req.query.returnTo && typeof req.query.returnTo === 'string') ? req.query.returnTo : '';
            const verseCount = chapterData.verses ? chapterData.verses.length : 0;
            const manifestReader = bibleService.loadBooksManifest();
            const isOldTestament = (manifestReader.at || []).some((b) => b && b.id === bookId);
            const jesusVerseNumbers = bibleService.getJesusVerseNumbersForChapter(bookId, chapter, verseCount);
            const godVerseNumbers = isOldTestament
                ? bibleService.getGodVerseNumbersForChapter(bookId, chapter, verseCount)
                : [];
            const sectionHeadings = bibleService.getSectionHeadingsForChapter(bookId, chapter);
            const allBooksList = (manifestReader.at || []).concat(manifestReader.nt || []);
            const chapterCountsByBook = {};
            allBooksList.forEach((b) => {
                if (b && b.id) chapterCountsByBook[b.id] = bibleService.getChapterCountForBook(b.id);
            });
            const frontendBase = getFrontendBase();
            const isLocal = isLocalFrontend(frontendBase);
            const ttsScriptSrc = frontendBase + (isLocal ? '/public_html/js/tts.js' : '/js/tts.js');
            res.render('bibleReader', {
                slug,
                translation,
                chapterData,
                baseUrl,
                tParam,
                biblePanelUrl,
                dashboardUrl: getDashboardHtmlUrl(),
                returnTo,
                API_URL: apiBaseForClient,
                ttsScriptSrc,
                jesusVerseNumbers: jesusVerseNumbers || [],
                godVerseNumbers: godVerseNumbers || [],
                isOldTestament,
                sectionHeadings: sectionHeadings || [],
                allBooksList,
                chapterCountsByBook
            });
        } finally {
            client.release();
        }
    } catch (e) {
        logger.error('publicBible reader:', e);
        res.status(500).send('<h1>Erro ao carregar capítulo</h1>');
    }
}));

/** /:slug/bible (URL antiga) → hub público /:slug/biblia */
router.get('/:slug/bible', (req, res) => {
    const slug = req.params.slug;
    res.redirect(302, `/${encodeURIComponent(slug)}/biblia`);
});

module.exports = router;
