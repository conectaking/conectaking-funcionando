const express = require('express');
const router = express.Router();
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');
const controller = require('./cartaoItens.controller');

router.get('/', protectUser, asyncHandler(controller.list));
router.get('/:id', protectUser, asyncHandler(controller.getById));

module.exports = router;
