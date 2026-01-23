/**
 * Rotas para o módulo de Subscription
 */

const express = require('express');
const router = express.Router();
const controller = require('./subscription.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// GET /api/subscription/info - Buscar informações da assinatura do usuário
router.get('/info', protectUser, asyncHandler(async (req, res) => {
    await controller.getSubscriptionInfo(req, res);
}));

// GET /api/subscription/plans - Buscar todos os planos (ADM pode editar)
router.get('/plans', protectUser, asyncHandler(async (req, res) => {
    await controller.getPlans(req, res);
}));

// GET /api/subscription/plans-public - Buscar planos disponíveis (público, sem autenticação)
router.get('/plans-public', asyncHandler(async (req, res) => {
    await controller.getPublicPlans(req, res);
}));

module.exports = router;
