/**
 * Rotas empresa: Minha equipe (lista de membros).
 */
const express = require('express');
const { protectUser } = require('../../../middleware/protectUser');
const { enrichUserForBusiness, protectBusinessOwner } = require('../empresa.middleware');
const controller = require('./equipe.controller');

const router = express.Router();

router.get('/team', protectUser, enrichUserForBusiness, protectBusinessOwner, controller.getTeam);

module.exports = router;
