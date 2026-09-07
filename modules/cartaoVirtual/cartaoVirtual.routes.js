const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const cartaoVirtualController = require('./cartaoVirtual.controller');

router.get('/api/:identifier', asyncHandler(cartaoVirtualController.getApi));
router.get('/:identifier', asyncHandler(cartaoVirtualController.getPage));

module.exports = router;
