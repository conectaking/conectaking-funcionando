/**
 * Rotas do módulo Checkout (KingForms - PagBank)
 * Montar em server.js: app.use('/api/checkout', checkoutRoutes); app.use('/api/webhooks', webhookRouter);
 */

const express = require('express');
const router = express.Router();
const controller = require('./checkout.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// —— Público (página de checkout) ——
// GET /api/checkout/page?submissionId=123 - dados para renderizar a página de checkout
router.get('/page', asyncHandler(controller.getCheckoutPage));

// POST /api/checkout/create - criar cobrança Pix/cartão (chamado pela página de checkout)
router.post('/create', asyncHandler(controller.createCharge));

// —— Admin (protegido) ——
router.use(protectUser);

// GET /api/checkout/preview-link?itemId=123 (antes de /config/:itemId)
router.get('/preview-link', asyncHandler(controller.getPreviewLink));

// GET /api/checkout/config/:itemId
router.get('/config/:itemId', asyncHandler(controller.getConfig));
// PUT /api/checkout/config/:itemId
router.put('/config/:itemId', asyncHandler(controller.saveConfig));
// POST /api/checkout/test-connection (body: profile_item_id)
router.post('/test-connection', asyncHandler(controller.testConnection));

module.exports = router;
