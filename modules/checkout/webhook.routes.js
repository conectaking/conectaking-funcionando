/**
 * Rotas de webhook do módulo Checkout (PagBank)
 * Montar em server.js: app.use('/api/webhooks', webhooksRoutes) - e incluir POST /api/webhooks/pagbank
 * Ou montar este router em /api/webhooks e definir POST /pagbank aqui.
 */

const express = require('express');
const router = express.Router();
const controller = require('./checkout.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

// PagBank envia POST para esta URL (sem autenticação; validar por assinatura)
router.post('/pagbank', express.json(), asyncHandler(controller.webhookPagbank));

module.exports = router;
