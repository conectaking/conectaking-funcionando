const express = require('express');
const router = express.Router();
const controller = require('./product.controller');
const { protectUser } = require('../../../middleware/protectUser');
const { asyncHandler } = require('../../../middleware/errorHandler');

// Todas as rotas requerem autenticação
router.use(protectUser);

// Listar produtos de uma página
router.get('/:salesPageId/products', asyncHandler(async (req, res) => {
    await controller.list(req, res);
}));

// Criar produto
router.post('/:salesPageId/products', asyncHandler(async (req, res) => {
    await controller.create(req, res);
}));

// Buscar produto por ID
router.get('/products/:productId', asyncHandler(async (req, res) => {
    await controller.findById(req, res);
}));

// Atualizar produto
router.put('/products/:productId', asyncHandler(async (req, res) => {
    await controller.update(req, res);
}));

// Atualizar status do produto
router.patch('/products/:productId/status', asyncHandler(async (req, res) => {
    await controller.updateStatus(req, res);
}));

// Deletar produto
router.delete('/products/:productId', asyncHandler(async (req, res) => {
    await controller.delete(req, res);
}));

// Reordenar produtos
router.post('/:salesPageId/products/reorder', asyncHandler(async (req, res) => {
    await controller.reorder(req, res);
}));

module.exports = router;

