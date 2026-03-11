/**
 * Rotas empresa: personalização da marca (logo).
 */
const express = require('express');
const { protectUser } = require('../../../middleware/protectUser');
const { enrichUserForBusiness, protectBusinessOwnerOrLogo } = require('../empresa.middleware');
const controller = require('./personalizacao.controller');

const router = express.Router();

router.put('/branding', protectUser, enrichUserForBusiness, protectBusinessOwnerOrLogo, controller.putBranding);

module.exports = router;
