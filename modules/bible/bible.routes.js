const express = require('express');
const router = express.Router();
const controller = require('./bible.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Rotas PÚBLICAS (sem autenticação) - versículo do dia, números e nomes
router.get('/verse-of-day', asyncHandler(controller.getVerseOfDay));
router.get('/numbers', asyncHandler(controller.getNumbers));
router.get('/names', asyncHandler(controller.getNameMeaning));

// Rotas PROTEGIDAS (requer login)
router.get('/config/:itemId', protectUser, asyncHandler(controller.getConfig));
router.put('/config/:itemId', protectUser, asyncHandler(controller.saveConfig));

module.exports = router;
