const express = require('express');
const router = express.Router();
const controller = require('./location.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

router.get('/config/:itemId', protectUser, asyncHandler(controller.getConfig));
router.put('/config/:itemId', protectUser, asyncHandler(controller.saveConfig));

module.exports = router;
