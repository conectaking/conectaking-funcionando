const express = require('express');
const multer = require('multer');
const router = express.Router();
const controller = require('./convite.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Áudio: em memória (controller grava em disco)
const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /^audio\//.test(file.mimetype) || /\.(mp3|ogg|wav|m4a)$/i.test(file.originalname || '');
        if (ok) cb(null, true);
        else cb(new Error('Apenas áudio (MP3, OGG, WAV, M4A)'), false);
    }
});

// Rota pública: servir áudio (convite público precisa carregar o arquivo)
router.get('/audio/:filename', controller.serveAudio);

router.use(protectUser);

// Rotas com path fixo ANTES de /config/:itemId para não capturar "preview-link" como itemId
router.get('/preview-link', asyncHandler(controller.getPreviewLink));
router.post('/upload-audio', uploadAudio.single('file'), asyncHandler(controller.uploadAudio));
router.get('/config/:itemId', asyncHandler(controller.getConfig));
router.put('/config/:itemId', asyncHandler(controller.saveConfig));
router.get('/stats/:itemId', asyncHandler(controller.getStats));

module.exports = router;
