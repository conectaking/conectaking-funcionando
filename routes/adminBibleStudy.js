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
const logger = require('../utils/logger');

const router = express.Router();

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
router.get('/bible/study/books', protectAdmin, async (req, res) => {
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

module.exports = router;
