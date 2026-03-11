/**
 * Rotas admin: Visão Geral (stats, advanced-stats, analytics, plans).
 */
const express = require('express');
const { protectAdmin } = require('../../../middleware/protectAdmin');
const controller = require('./overview.controller');

const router = express.Router();

router.get('/stats', protectAdmin, controller.getStats);
router.get('/advanced-stats', protectAdmin, controller.getAdvancedStats);
router.get('/analytics/users', protectAdmin, controller.getAnalyticsUsers);
router.get('/analytics/user/:userId/details', protectAdmin, controller.getAnalyticsUserDetails);
router.get('/plans', protectAdmin, controller.getPlans);
router.patch('/plans/:id', protectAdmin, controller.patchPlan);

module.exports = router;
