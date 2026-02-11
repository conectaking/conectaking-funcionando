const express = require('express');
const router = express.Router();
const controller = require('./orcamentos.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

router.use(protectUser);

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.patch('/:id/status', asyncHandler(controller.updateStatus));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
