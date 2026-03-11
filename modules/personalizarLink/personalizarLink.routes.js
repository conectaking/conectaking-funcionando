/**
 * Rotas: imagem OG e configuração do link preview (personalizar link).
 * Montar em / (og-image.jpg) e em /api/admin (link-preview-config).
 */
const express = require('express');
const { asyncHandler } = require('../../middleware/errorHandler');
const { protectAdmin } = require('../../middleware/protectAdmin');
const controller = require('./personalizarLink.controller');

const router = express.Router();

router.get('/og-image.jpg', asyncHandler(controller.getOgImage));
router.get('/link-preview-config', protectAdmin, asyncHandler(controller.getLinkPreviewConfig));
router.post('/link-preview-config', protectAdmin, asyncHandler(controller.postLinkPreviewConfig));

module.exports = router;
