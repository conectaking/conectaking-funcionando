const express = require('express');
const router = express.Router();
const controller = require('./analytics.controller');
const { protectUser } = require('../../../middleware/protectUser');
const { asyncHandler } = require('../../../middleware/errorHandler');

// Registrar evento (público - sem autenticação)
router.post('/track', asyncHandler(async (req, res) => {
    await controller.trackEvent(req, res);
}));

// Rotas que requerem autenticação
router.use(protectUser);

// Buscar analytics de uma página
router.get('/:salesPageId', asyncHandler(async (req, res) => {
    await controller.getAnalytics(req, res);
}));

// Buscar analytics de um produto
router.get('/products/:productId', asyncHandler(async (req, res) => {
    await controller.getProductAnalytics(req, res);
}));

// Buscar funil de vendas
router.get('/:salesPageId/funnel', asyncHandler(async (req, res) => {
    await controller.getSalesFunnel(req, res);
}));

// Buscar ranking de produtos
router.get('/:salesPageId/ranking', asyncHandler(async (req, res) => {
    await controller.getProductRanking(req, res);
}));

module.exports = router;

