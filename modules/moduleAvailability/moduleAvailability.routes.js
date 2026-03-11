const express = require('express');
const router = express.Router();
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');
const controller = require('./moduleAvailability.controller');

router.get('/plan-availability-public', asyncHandler(controller.getPlanAvailabilityPublic));
router.get('/plan-availability', protectUser, asyncHandler(controller.getPlanAvailability));
router.put('/plan-availability', protectUser, asyncHandler(controller.updatePlanAvailability));
router.get('/available', protectUser, asyncHandler(controller.getAvailable));
router.get('/individual-plans', protectUser, asyncHandler(controller.getIndividualPlans));
router.get('/users-list', protectUser, asyncHandler(controller.getUsersList));
router.get('/individual-plans/:userId', protectUser, asyncHandler(controller.getIndividualPlansForUser));
router.put('/individual-plans/:userId', protectUser, asyncHandler(controller.putIndividualPlansForUser));
router.get('/configure-modules-page/:userId', protectUser, asyncHandler(controller.getConfigureModulesPage));

module.exports = router;
