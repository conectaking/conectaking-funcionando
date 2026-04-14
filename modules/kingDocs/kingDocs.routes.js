/**
 * Rotas King Docs — módulo isolado sob /api/king-docs
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const config = require('../../config');
const { protectUser } = require('../../middleware/protectUser');
const { requireModule } = require('../../middleware/requireModule');
const { asyncHandler } = require('../../middleware/errorHandler');
const controller = require('./kingDocs.controller');

const skipOptions = (req) => req.method === 'OPTIONS';

const kingDocsUnlockLimiter = rateLimit({
  windowMs: config.rateLimit.kingDocsUnlock.windowMs,
  max: config.rateLimit.kingDocsUnlock.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: skipOptions,
  message: 'Muitas tentativas de senha. Aguarde alguns minutos.',
  handler: (req, res) => {
    const retryAfter = Math.ceil(config.rateLimit.kingDocsUnlock.windowMs / 1000);
    res.set('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de senha. Aguarde alguns minutos.',
      retryAfter
    });
  }
});

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

/* ---------- Rotas públicas (sem auth) ---------- */
router.get('/public/:token/meta', asyncHandler(controller.publicMeta));
router.post(
  '/public/:token/unlock',
  kingDocsUnlockLimiter,
  express.json(),
  asyncHandler(controller.publicUnlock)
);
router.get('/public/:token/data', asyncHandler(controller.publicData));
router.get('/public/:token/file/:fileId', asyncHandler(controller.publicDownloadFile));

/* ---------- Rotas autenticadas + plano ---------- */
router.get('/vault', protectUser, requireModule('king_docs'), asyncHandler(controller.getVault));
router.put('/vault', protectUser, requireModule('king_docs'), express.json({ limit: '512kb' }), asyncHandler(controller.putVault));
router.post('/vault/import-profile', protectUser, requireModule('king_docs'), asyncHandler(controller.importProfile));
router.get('/vault/export-pdf', protectUser, requireModule('king_docs'), asyncHandler(controller.exportPdf));

router.get('/files/:id/download', protectUser, requireModule('king_docs'), asyncHandler(controller.downloadFile));
router.get('/files', protectUser, requireModule('king_docs'), asyncHandler(controller.listFiles));
router.post(
  '/files',
  protectUser,
  requireModule('king_docs'),
  upload.single('file'),
  asyncHandler(controller.uploadFile)
);
router.delete('/files/:id', protectUser, requireModule('king_docs'), asyncHandler(controller.deleteFile));

router.post('/shares', protectUser, requireModule('king_docs'), express.json({ limit: '512kb' }), asyncHandler(controller.createShare));
router.get('/shares', protectUser, requireModule('king_docs'), asyncHandler(controller.listShares));
router.delete('/shares/:id/permanent', protectUser, requireModule('king_docs'), asyncHandler(controller.deleteSharePermanent));
router.delete('/shares/:id', protectUser, requireModule('king_docs'), asyncHandler(controller.revokeShare));

module.exports = router;
