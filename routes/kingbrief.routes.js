/**
 * KingBrief – Rotas API
 * POST / (upload áudio), GET / (listar), GET /usage (estatísticas), GET /:id, PATCH /:id, DELETE /:id
 */

const express = require('express');
const multer = require('multer');
const config = require('../config');
const { protectKingBrief } = require('../middleware/protectKingBrief');
const { asyncHandler } = require('../middleware/errorHandler');
const controller = require('../modules/kingbrief/kingbrief.controller');

const router = express.Router();

const maxFileSize = config.upload.kingbriefMaxFileSize || 200 * 1024 * 1024; // 200MB
const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize },
    fileFilter: (req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        if (mime.startsWith('audio/')) cb(null, true);
        else cb(new Error('Apenas ficheiros de áudio são permitidos (mp3, wav, m4a, webm).'), false);
    }
});

// Todas as rotas exigem autenticação e módulo kingbrief no plano
router.use(protectKingBrief);

router.post('/', uploadAudio.single('audio'), asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/usage', asyncHandler(controller.usage));
router.get('/:id', asyncHandler(controller.getById));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
