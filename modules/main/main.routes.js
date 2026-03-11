const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const mainController = require('./main.controller');

router.get('/', asyncHandler(mainController.getRoot));

module.exports = router;
