/**
 * Rotas do módulo de Assinatura
 */

const express = require('express');
const router = express.Router();
const controller = require('./subscription.controller');
const validators = require('./subscription.validators');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// GET /api/subscription/info - Informações da assinatura do usuário
router.get('/info',
    protectUser,
    validators.validateBillingType(),
    validators.handleValidationErrors,
    asyncHandler(async (req, res) => {
        await controller.getInfo(req, res);
    })
);

// GET /api/subscription/plans - Listar todos os planos (apenas admin)
router.get('/plans',
    protectUser,
    asyncHandler(async (req, res) => {
        await controller.getPlans(req, res);
    })
);

// GET /api/subscription/plans-public - Listar planos disponíveis (público)
router.get('/plans-public',
    validators.validateBillingType(),
    validators.handleValidationErrors,
    asyncHandler(async (req, res) => {
        await controller.getPlansPublic(req, res);
    })
);

// PUT /api/subscription/plans/:id - Atualizar plano (apenas admin)
router.put('/plans/:id',
    protectUser,
    validators.validateUpdatePlan(),
    validators.handleValidationErrors,
    asyncHandler(async (req, res) => {
        await controller.updatePlan(req, res);
    })
);

// POST /api/subscription/plans - Criar novo plano (apenas admin)
router.post('/plans',
    protectUser,
    validators.validateCreatePlan(),
    validators.handleValidationErrors,
    asyncHandler(async (req, res) => {
        await controller.createPlan(req, res);
    })
);

module.exports = router;
