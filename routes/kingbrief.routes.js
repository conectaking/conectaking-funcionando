/**
 * Rotas KingBrief: POST (upload), GET (list), GET /:id, PATCH /:id, DELETE /:id, GET /usage
 * Proteção: protectKingBrief (auth + módulo no plano). Upload com multer (áudio, limite 200MB).
 */

const express = require('express');
const multer = require('multer');
const config = require('../config');
const { protectKingBrief } = require('../modules/kingbrief/protectKingBrief');
const controller = require('../modules/kingbrief/kingbrief.controller');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Rota pública (sem auth): link partilhável só leitura
router.get('/shared/:token', asyncHandler(controller.getSharedByToken));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.kingbriefMaxFileSize },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas ficheiros de áudio são permitidos (mp3, wav, m4a, webm).'), false);
        }
    }
});

router.use(protectKingBrief);

router.post('/upload-url', express.json(), asyncHandler(controller.uploadUrl));
router.post('/confirm', express.json(), asyncHandler(controller.confirm));
router.post('/', upload.single('audio'), asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/usage', asyncHandler(controller.usage));
router.get('/:id/business', asyncHandler(controller.businessReport));
router.get('/:id/lesson', asyncHandler(controller.lessonReport));
router.get('/:id/communication', asyncHandler(controller.communicationReport));
router.post('/:id/improve-text', express.json(), asyncHandler(controller.improveText));
router.post('/:id/regenerate-mindmap', asyncHandler(controller.regenerateMindmap));
router.get('/:id', asyncHandler(controller.getById));
router.post('/:id/share', asyncHandler(controller.generateShareToken));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
