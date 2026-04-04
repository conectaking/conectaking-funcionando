/**
 * Rotas admin para estudos por livro da Bíblia: listar livros e fazer upload de Word/PDF.
 * Apenas ADM pode acessar. O texto extraído é salvo em bible_book_studies.
 */
const express = require('express');
const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { protectAdmin } = require('../middleware/protectAdmin');
const bibleService = require('../modules/bible/bible.service');
const bibleRepository = require('../modules/bible/bible.repository');
const bibleAdminDev365 = require('../modules/bible/bible.adminDev365.service');
const bibleDevotionalAi = require('../modules/bible/bibleDevotionalAi.service');
const logger = require('../utils/logger');

const router = express.Router();

function dev365FullThemeFlag(body) {
    if (!body || typeof body !== 'object') return false;
    const v = body.fullTheme;
    return v === true || v === 'true' || v === 1 || v === '1';
}

/** Fallback: lista dos 66 livros quando o manifest (arquivo) não carrega (ex.: path em produção). */
const BOOKS_MANIFEST_FALLBACK = {
    at: [
        { id: 'gn', name: 'Gênesis' }, { id: 'ex', name: 'Êxodo' }, { id: 'lv', name: 'Levítico' }, { id: 'nm', name: 'Números' }, { id: 'dt', name: 'Deuteronômio' },
        { id: 'js', name: 'Josué' }, { id: 'jud', name: 'Juízes' }, { id: 'rt', name: 'Rute' }, { id: '1sm', name: '1 Samuel' }, { id: '2sm', name: '2 Samuel' },
        { id: '1kgs', name: '1 Reis' }, { id: '2kgs', name: '2 Reis' }, { id: '1ch', name: '1 Crônicas' }, { id: '2ch', name: '2 Crônicas' }, { id: 'ezr', name: 'Esdras' },
        { id: 'ne', name: 'Neemias' }, { id: 'et', name: 'Ester' }, { id: 'job', name: 'Jó' }, { id: 'ps', name: 'Salmos' }, { id: 'prv', name: 'Provérbios' },
        { id: 'ec', name: 'Eclesiastes' }, { id: 'so', name: 'Cânticos' }, { id: 'is', name: 'Isaías' }, { id: 'jr', name: 'Jeremias' }, { id: 'lm', name: 'Lamentações' },
        { id: 'ez', name: 'Ezequiel' }, { id: 'dn', name: 'Daniel' }, { id: 'ho', name: 'Oseias' }, { id: 'jl', name: 'Joel' }, { id: 'am', name: 'Amós' },
        { id: 'ob', name: 'Obadias' }, { id: 'jn', name: 'Jonas' }, { id: 'mi', name: 'Miqueias' }, { id: 'na', name: 'Naum' }, { id: 'hk', name: 'Habacuque' },
        { id: 'zp', name: 'Sofonias' }, { id: 'hg', name: 'Ageu' }, { id: 'zc', name: 'Zacarias' }, { id: 'ml', name: 'Malaquias' }
    ],
    nt: [
        { id: 'mt', name: 'Mateus' }, { id: 'mk', name: 'Marcos' }, { id: 'lk', name: 'Lucas' }, { id: 'jo', name: 'João' }, { id: 'act', name: 'Atos' },
        { id: 'rm', name: 'Romanos' }, { id: '1co', name: '1 Coríntios' }, { id: '2co', name: '2 Coríntios' }, { id: 'gl', name: 'Gálatas' }, { id: 'eph', name: 'Efésios' },
        { id: 'ph', name: 'Filipenses' }, { id: 'cl', name: 'Colossenses' }, { id: '1ts', name: '1 Tessalonicenses' }, { id: '2ts', name: '2 Tessalonicenses' },
        { id: '1tm', name: '1 Timóteo' }, { id: '2tm', name: '2 Timóteo' }, { id: 'tt', name: 'Tito' }, { id: 'phm', name: 'Filemom' }, { id: 'hb', name: 'Hebreus' },
        { id: 'jm', name: 'Tiago' }, { id: '1pe', name: '1 Pedro' }, { id: '2pe', name: '2 Pedro' }, { id: '1jo', name: '1 João' }, { id: '2jo', name: '2 João' },
        { id: '3jo', name: '3 João' }, { id: 'jd', name: 'Judas' }, { id: 're', name: 'Apocalipse' }
    ]
};

const ALLOWED_MIMES = [
    'application/msword',                                                                 // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',            // .docx
    'application/pdf'
];
const ALLOWED_EXT = ['.doc', '.docx', '.pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const uploadStudy = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        const ext = path.extname((file.originalname || '').toLowerCase());
        const mimeOk = ALLOWED_MIMES.some(m => mime === m);
        const extOk = ALLOWED_EXT.some(e => ext === e);
        if (mimeOk || extOk) return cb(null, true);
        cb(new Error('Apenas arquivos Word (.doc, .docx) ou PDF são permitidos.'), false);
    }
});

/** GET /api/admin/bible/study/books — Lista todos os livros com indicador has_study (só ADM). */
router.get('/bible/study/books', protectAdmin, (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
}, async (req, res) => {
    try {
        let books = await bibleService.getStudyBooks();
        if (!books || books.length === 0) {
            const fallback = BOOKS_MANIFEST_FALLBACK;
            const allBooks = [].concat(fallback.at || [], fallback.nt || []);
            const bookIdsWithStudy = new Set(await bibleRepository.getBookIdsWithFullStudy());
            books = allBooks
                .filter(b => b && b.id)
                .map(b => ({ book_id: b.id, book_name: b.name || b.id, has_study: bookIdsWithStudy.has(b.id) }));
        }
        res.json({ success: true, data: { books } });
    } catch (e) {
        logger.error('adminBibleStudy getStudyBooks:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao listar livros.' });
    }
});

/** DELETE /api/admin/bible/study/book/:bookId — Remove o estudo do livro (só ADM). */
router.delete('/bible/study/book/:bookId', protectAdmin, async (req, res) => {
    const bookId = (req.params.bookId || '').trim();
    if (!bookId) {
        return res.status(400).json({ success: false, message: 'bookId é obrigatório.' });
    }
    try {
        const removed = await bibleRepository.deleteBookStudy(bookId);
        if (!removed) {
            return res.status(404).json({ success: false, message: 'Estudo deste livro não foi encontrado.' });
        }
        logger.info(`Admin: estudo do livro ${bookId} removido.`);
        res.json({ success: true, message: 'Estudo removido com sucesso.' });
    } catch (e) {
        logger.error('adminBibleStudy deleteBookStudy:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao remover estudo.' });
    }
});

/** POST /api/admin/bible/study/book/:bookId/upload — Upload Word/PDF, extrai texto e grava em bible_book_studies (só ADM). */
router.post('/bible/study/book/:bookId/upload', protectAdmin, (req, res, next) => {
    uploadStudy.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'Arquivo muito grande. Máximo 15 MB.' });
            }
            return res.status(400).json({ success: false, message: err.message || 'Erro no upload.' });
        }
        next();
    });
}, async (req, res) => {
    const bookId = (req.params.bookId || '').trim();
    if (!bookId) {
        return res.status(400).json({ success: false, message: 'bookId é obrigatório.' });
    }
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Envie um arquivo Word (.doc/.docx) ou PDF.' });
    }

    const buffer = req.file.buffer;
    const mime = (req.file.mimetype || '').toLowerCase();
    const ext = path.extname((req.file.originalname || '').toLowerCase()).toLowerCase();

    let text = '';
    try {
        if (mime === 'application/pdf' || ext === '.pdf') {
            const data = await pdfParse(buffer);
            text = (data && data.text) ? data.text : '';
        } else {
            const result = await mammoth.extractRawText({ buffer });
            text = (result && result.value) ? result.value : '';
        }
    } catch (extractErr) {
        logger.error('adminBibleStudy extract text:', extractErr);
        return res.status(400).json({
            success: false,
            message: 'Não foi possível extrair o texto do arquivo. Verifique se o arquivo não está corrompido.'
        });
    }

    const trimmed = (text || '').trim();
    if (!trimmed) {
        return res.status(400).json({
            success: false,
            message: 'O arquivo não contém texto extraível ou está vazio.'
        });
    }

    try {
        const manifest = bibleService.loadBooksManifest();
        const allBooks = (manifest.at || []).concat(manifest.nt || []);
        const bookMeta = allBooks.find(b => b && (b.id === bookId || (b.id || '').toLowerCase() === bookId.toLowerCase()));
        const bookName = bookMeta ? (bookMeta.name || bookId) : bookId;
        const title = `Estudo: ${bookName}`;

        await bibleRepository.upsertBookStudy(bookId, title, trimmed);
        logger.info(`Admin: estudo do livro ${bookId} (${bookName}) atualizado por upload.`);
        res.json({
            success: true,
            message: `Estudo de "${bookName}" foi importado com sucesso.`,
            data: { book_id: bookId, book_name: bookName, content_length: trimmed.length }
        });
    } catch (dbErr) {
        logger.error('adminBibleStudy upsertBookStudy:', dbErr);
        res.status(500).json({
            success: false,
            message: dbErr.message || 'Erro ao salvar o estudo no banco.'
        });
    }
});

// --- Devocionais 365 (só ADM): listar dias com conteúdo, adicionar/editar, remover ---

/** GET /api/admin/bible/devotionals-365/day/:day — Devocional completo (visualização). */
router.get('/bible/devotionals-365/day/:day', protectAdmin, async (req, res) => {
    const day = parseInt(req.params.day, 10);
    if (!day || day < 1 || day > 365) {
        return res.status(400).json({ success: false, message: 'Dia 1–365.' });
    }
    try {
        const row = await bibleRepository.getDevocional365(day);
        if (!row) {
            return res.status(404).json({ success: false, message: 'Sem registo para este dia.' });
        }
        res.json({ success: true, data: row });
    } catch (e) {
        logger.error('adminBibleStudy get dev365 day:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro.' });
    }
});

/** GET /api/admin/bible/devotionals-365/admin-full — Lista todos os registos (tabela admin). */
router.get('/bible/devotionals-365/admin-full', protectAdmin, async (req, res) => {
    try {
        const data = await bibleAdminDev365.getAdminDev365List();
        res.json({ success: true, data });
    } catch (e) {
        logger.error('adminBibleStudy admin-full dev365:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro.' });
    }
});

/** POST /api/admin/bible/devotionals-365/day/:day/generate-ai — Gera devocional completo com IA e grava na BD. */
router.post('/bible/devotionals-365/day/:day/generate-ai', protectAdmin, async (req, res) => {
    const day = parseInt(req.params.day, 10);
    let year = parseInt(req.body.year || req.query.year, 10);
    if (!day || day < 1 || day > 365) {
        return res.status(400).json({ success: false, message: 'Dia 1–365.' });
    }
    if (Number.isNaN(year) || year < 2000 || year > 2100) year = new Date().getFullYear();
    try {
        const r = await bibleAdminDev365.generateDayAndSave(day, year, {
            temaModo: req.body.temaModo || 'mes_auto',
            temaPersonalizado: req.body.temaPersonalizado || '',
            estilo: req.body.estilo === 'cunha' ? 'cunha' : 'padrao',
            fullTheme: req.body && Object.prototype.hasOwnProperty.call(req.body, 'fullTheme')
                ? dev365FullThemeFlag(req.body)
                : true
        });
        if (!r.ok) return res.status(400).json({ success: false, message: r.error || 'Falha ao gerar.' });
        res.json({ success: true, data: r.data });
    } catch (e) {
        logger.error('adminBibleStudy generate-ai day:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro.' });
    }
});

/** POST /api/admin/bible/devotionals-365/generate-range-ai — Gera um intervalo de dias (lote). Body: start, end, year, delayMs, temaModo, estilo */
router.post('/bible/devotionals-365/generate-range-ai', protectAdmin, async (req, res) => {
    const start = parseInt(req.body.start, 10);
    const end = parseInt(req.body.end, 10);
    let year = parseInt(req.body.year, 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) year = new Date().getFullYear();
    if (Number.isNaN(start) || Number.isNaN(end)) {
        return res.status(400).json({ success: false, message: 'Informe start e end (1–365).' });
    }
    try {
        const out = await bibleAdminDev365.generateRangeAndSave(start, end, year, {
            delayMs: req.body.delayMs,
            temaModo: req.body.temaModo || 'mes_auto',
            temaPersonalizado: req.body.temaPersonalizado || '',
            estilo: req.body.estilo === 'cunha' ? 'cunha' : 'padrao',
            fullTheme: dev365FullThemeFlag(req.body)
        });
        res.json({ success: true, data: out });
    } catch (e) {
        logger.error('adminBibleStudy generate-range-ai:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro.' });
    }
});

/** POST /api/admin/bible/devotionals-365/generate-month-ai/:year/:month — Gera todos os dias do mês civil (1–12) com tema do mês. */
router.post('/bible/devotionals-365/generate-month-ai/:year/:month', protectAdmin, async (req, res) => {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100 || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Ano ou mês inválido.' });
    }
    try {
        const out = await bibleAdminDev365.generateMonthAndSave(year, month, {
            delayMs: req.body && req.body.delayMs,
            temaModo: (req.body && req.body.temaModo) || 'mes_auto',
            temaPersonalizado: (req.body && req.body.temaPersonalizado) || '',
            estilo: req.body && req.body.estilo === 'cunha' ? 'cunha' : 'padrao',
            fullTheme: dev365FullThemeFlag(req.body)
        });
        res.json({ success: true, data: out });
    } catch (e) {
        logger.error('adminBibleStudy generate-month-ai:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro.' });
    }
});

/** POST /api/admin/bible/devotionals-365/generate-calendar-months-async — Meses civis em segundo plano. Body: { year, months: [1,3] | "all", delayMs, temaModo, estilo } */
router.post('/bible/devotionals-365/generate-calendar-months-async', protectAdmin, async (req, res) => {
    let year = parseInt(req.body && req.body.year, 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) year = new Date().getFullYear();
    try {
        const out = bibleAdminDev365.startCalendarMonthsBackgroundJob(year, req.body && req.body.months, {
            delayMs: req.body && req.body.delayMs,
            temaModo: (req.body && req.body.temaModo) || 'mes_auto',
            temaPersonalizado: (req.body && req.body.temaPersonalizado) || '',
            estilo: req.body && req.body.estilo === 'cunha' ? 'cunha' : 'padrao',
            fullTheme: dev365FullThemeFlag(req.body)
        });
        if (!out.ok) {
            return res.status(400).json({ success: false, message: out.error || 'Pedido inválido.' });
        }
        res.status(202).json({ success: true, data: { jobId: out.jobId, total: out.total } });
    } catch (e) {
        logger.error('adminBibleStudy generate-calendar-months-async:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro.' });
    }
});

/** GET /api/admin/bible/devotionals-365/generation-job/:jobId — Estado do trabalho em segundo plano (memória do processo). */
router.get('/bible/devotionals-365/generation-job/:jobId', protectAdmin, async (req, res) => {
    try {
        const j = bibleAdminDev365.getDev365GenerationJob(req.params.jobId);
        if (!j) {
            return res.status(404).json({ success: false, message: 'Trabalho não encontrado ou já expirou (memória do servidor).' });
        }
        res.json({ success: true, data: j });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

/** GET /api/admin/bible/devotionals-365/month-themes/:year */
router.get('/bible/devotionals-365/month-themes/:year', protectAdmin, async (req, res) => {
    const year = parseInt(req.params.year, 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Ano inválido.' });
    }
    try {
        const themes = bibleAdminDev365.getMonthThemesForYear(year);
        res.json({ success: true, data: { year, themes } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

/** PUT /api/admin/bible/devotionals-365/month-themes/:year — Body: { "1": "...", "2": "...", ... "12": "..." } */
router.put('/bible/devotionals-365/month-themes/:year', protectAdmin, async (req, res) => {
    const year = parseInt(req.params.year, 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Ano inválido.' });
    }
    try {
        const themes = bibleAdminDev365.setAllMonthThemesForYear(year, req.body || {});
        res.json({ success: true, data: { year, themes } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

/** POST /api/admin/bible/devotionals-365/month-themes/:year/generate/:month (1-12) */
router.post('/bible/devotionals-365/month-themes/:year/generate/:month', protectAdmin, async (req, res) => {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    if (Number.isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Ano ou mês inválido.' });
    }
    try {
        const hint = (req.body && req.body.hint) || '';
        const r = await bibleDevotionalAi.generateMonthThemeLine(year, month, hint);
        if (r.error) return res.status(400).json({ success: false, message: r.error });
        const themes = bibleAdminDev365.setMonthTheme(year, month, r.text);
        res.json({ success: true, data: { year, month, text: r.text, themes } });
    } catch (e) {
        logger.error('adminBibleStudy generate month theme:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

/** POST /api/admin/bible/devotionals-365/month-themes/:year/generate-all — gera os 12 meses */
router.post('/bible/devotionals-365/month-themes/:year/generate-all', protectAdmin, async (req, res) => {
    const year = parseInt(req.params.year, 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Ano inválido.' });
    }
    try {
        const delayMs = req.body && req.body.delayMs != null ? req.body.delayMs : 400;
        const r = await bibleDevotionalAi.generateAllMonthThemesForYear(year, delayMs);
        if (r.errors && r.errors.length === 12) {
            return res.status(400).json({ success: false, message: r.errors[0].error || 'Falha.', errors: r.errors });
        }
        const themes = bibleAdminDev365.setAllMonthThemesForYear(year, r.themes);
        res.json({ success: true, data: { year, themes, errors: r.errors } });
    } catch (e) {
        logger.error('adminBibleStudy generate-all month themes:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

/** GET /api/admin/bible/devotionals-365/days — Lista dias 1-365 com has_devocional (só ADM). */
router.get('/bible/devotionals-365/days', protectAdmin, async (req, res) => {
    try {
        const daysWithContent = await bibleRepository.getDevotionals365DaysWithContent();
        const set = new Set(daysWithContent || []);
        const days = Array.from({ length: 365 }, (_, i) => ({
            day: i + 1,
            has_devocional: set.has(i + 1)
        }));
        res.json({ success: true, data: { days } });
    } catch (e) {
        logger.error('adminBibleStudy getDevotionals365Days:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao listar dias.' });
    }
});

/** PUT /api/admin/bible/devotionals-365/:day — Cria ou atualiza devocional do dia (só ADM). Body: titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao */
router.put('/bible/devotionals-365/:day', protectAdmin, async (req, res) => {
    const day = parseInt(req.params.day, 10);
    if (!day || day < 1 || day > 365) {
        return res.status(400).json({ success: false, message: 'Dia deve ser entre 1 e 365.' });
    }
    try {
        await bibleRepository.upsertDevocional365(day, req.body || {});
        res.json({ success: true, message: 'Devocional do dia ' + day + ' salvo com sucesso.' });
    } catch (e) {
        logger.error('adminBibleStudy upsertDevocional365:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao salvar.' });
    }
});

/** DELETE /api/admin/bible/devotionals-365/:day — Remove devocional do dia (só ADM). */
router.delete('/bible/devotionals-365/:day', protectAdmin, async (req, res) => {
    const day = parseInt(req.params.day, 10);
    if (!day || day < 1 || day > 365) {
        return res.status(400).json({ success: false, message: 'Dia deve ser entre 1 e 365.' });
    }
    try {
        const removed = await bibleRepository.deleteDevocional365(day);
        if (!removed) {
            return res.status(404).json({ success: false, message: 'Devocional deste dia não encontrado.' });
        }
        logger.info(`Admin: devocional 365 dia ${day} removido.`);
        res.json({ success: true, message: 'Devocional removido com sucesso.' });
    } catch (e) {
        logger.error('adminBibleStudy deleteDevocional365:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao remover.' });
    }
});

module.exports = router;
