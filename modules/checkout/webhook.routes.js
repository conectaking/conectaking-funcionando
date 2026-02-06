/**
 * Rotas de webhook do módulo Checkout (PagBank)
 * Aceita:
 * - application/json (webhook moderno com assinatura)
 * - application/x-www-form-urlencoded (Notificação de transação - painel comercial, sem secret)
 * Body bruto é capturado para assinatura quando for JSON.
 */

const express = require('express');
const router = express.Router();
const controller = require('./checkout.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

// Capturar body bruto para qualquer content-type (JSON ou urlencoded)
router.post('/pagbank', express.raw({ type: () => true }), asyncHandler(controller.webhookPagbank));

module.exports = router;
