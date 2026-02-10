const express = require('express');
const router = express.Router();
const controller = require('./convite.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

router.use(protectUser);

router.get('/config/:itemId', asyncHandler(controller.getConfig));
router.put('/config/:itemId', asyncHandler(controller.saveConfig));
router.get('/preview-link', asyncHandler(controller.getPreviewLink));
router.get('/stats/:itemId', asyncHandler(controller.getStats));

module.exports = router;
