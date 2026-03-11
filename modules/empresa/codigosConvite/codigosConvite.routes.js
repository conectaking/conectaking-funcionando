/**
 * Rotas empresa: códigos de convite (listar, gerar automático, gerar manual).
 */
const express = require('express');
const { protectUser } = require('../../../middleware/protectUser');
const { enrichUserForBusiness, protectBusinessOwner } = require('../empresa.middleware');
const controller = require('./codigosConvite.controller');

const router = express.Router();

router.get('/codes', protectUser, enrichUserForBusiness, protectBusinessOwner, controller.getCodes);
router.post('/generate-code', protectUser, enrichUserForBusiness, protectBusinessOwner, controller.postGenerateCode);
router.post('/codes/generate-manual', protectUser, enrichUserForBusiness, protectBusinessOwner, controller.postGenerateManual);

module.exports = router;
