/**
 * Rotas de webhook do módulo Checkout (PagBank)
 * Body bruto é necessário para validar assinatura (SHA256 token-payload).
 */

const express = require('express');
const router = express.Router();
const controller = require('./checkout.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

// PagBank: validar assinatura com body bruto (express.raw)
router.post('/pagbank', express.raw({ type: 'application/json' }), asyncHandler(controller.webhookPagbank));

module.exports = router;
