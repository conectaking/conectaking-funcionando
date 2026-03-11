/**
 * Rotas: assinatura (info, planos admin, atualizar plano, planos públicos).
 */
const express = require('express');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');
const controller = require('./assinatura.controller');

const router = express.Router();

router.get('/info', protectUser, asyncHandler(controller.getInfo));
router.get('/plans', protectUser, asyncHandler(controller.getPlans));
router.put('/plans/:id', protectUser, asyncHandler(controller.putPlan));
router.get('/plans-public', asyncHandler(controller.getPlansPublic));

module.exports = router;
