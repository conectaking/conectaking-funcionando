/**
 * Rotas: compartilhar (vCard por identificador).
 */
const express = require('express');
const { asyncHandler } = require('../../middleware/errorHandler');
const controller = require('./compartilhar.controller');

const router = express.Router();

router.get('/:identifier', asyncHandler(controller.getVcard));

module.exports = router;
