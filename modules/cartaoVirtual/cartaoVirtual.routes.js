const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const cartaoVirtualController = require('./cartaoVirtual.controller');

router.get('/:identifier', asyncHandler(cartaoVirtualController.getPage));
router.get('/api/:identifier', asyncHandler(cartaoVirtualController.getApi));

module.exports = router;
