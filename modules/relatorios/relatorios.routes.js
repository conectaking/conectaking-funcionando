/**
 * Rotas: relatórios/analytics (KPIs, performance, top itens, detalhes).
 */
const express = require('express');
const { protectUser } = require('../../middleware/protectUser');
const controller = require('./relatorios.controller');

const router = express.Router();

router.get('/kpis', protectUser, controller.getKpis);
router.get('/performance', protectUser, controller.getPerformance);
router.get('/top-items', protectUser, controller.getTopItems);
router.get('/details', protectUser, controller.getDetails);

module.exports = router;
