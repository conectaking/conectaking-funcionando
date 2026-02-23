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
        const books = await bibleService.getStudyBooks();
        res.json({ success: true, data: { books } });
    } catch (e) {
        logger.error('adminBibleStudy getStudyBooks:', e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao listar livros.' });
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
