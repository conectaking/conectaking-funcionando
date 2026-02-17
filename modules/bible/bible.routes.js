const express = require('express');
const router = express.Router();
const controller = require('./bible.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Rotas PÚBLICAS (sem autenticação) - versículo do dia, números e nomes
router.get('/verse-of-day', asyncHandler(controller.getVerseOfDay));
router.get('/books', asyncHandler(controller.getBooksManifest));
router.get('/book/:bookId/:chapter', asyncHandler(controller.getBookChapter));
router.get('/palavra-do-dia', asyncHandler(controller.getPalavraDoDia));
router.get('/salmo-do-dia', asyncHandler(controller.getSalmoDoDia));
router.get('/devocional-do-dia', asyncHandler(controller.getDevocionalDoDia));
router.get('/devotionals-365/:day', asyncHandler(controller.getDevocional365));
router.get('/numbers', asyncHandler(controller.getNumbers));
router.get('/names', asyncHandler(controller.getNameMeaning));

// Ecossistema Bíblico - Estudos e Esboços
router.get('/study-themes', asyncHandler(controller.getStudyThemes));
router.get('/studies', asyncHandler(controller.getStudies));
router.get('/studies/:themeSlug/:studySlug', asyncHandler(controller.getStudyBySlug));
router.get('/outline-categories', asyncHandler(controller.getOutlineCategories));
router.get('/outlines', asyncHandler(controller.getOutlines));
router.get('/outlines/:categorySlug/:outlineSlug', asyncHandler(controller.getOutlineBySlug));
router.get('/search', asyncHandler(controller.searchBible));

// TTS: áudio do trecho (cache R2 + Google TTS). Público para o leitor da Bíblia.
router.get('/tts/audio', asyncHandler(controller.getTtsAudio));

// Rotas PROTEGIDAS (requer login)
router.get('/config/:itemId', protectUser, asyncHandler(controller.getConfig));
router.put('/config/:itemId', protectUser, asyncHandler(controller.saveConfig));
router.get('/my-progress', protectUser, asyncHandler(controller.getMyProgress));
router.post('/mark-read', protectUser, asyncHandler(controller.markRead));

module.exports = router;
