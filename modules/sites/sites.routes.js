const express = require('express');
const router = express.Router();
const controller = require('./sites.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

router.use(protectUser);

router.get('/config/:itemId', asyncHandler(controller.getConfig));
router.put('/config/:itemId', asyncHandler(controller.saveConfig));
router.get('/arquetipo-leads/:itemId', asyncHandler(controller.getArquetipoLeads));

module.exports = router;
