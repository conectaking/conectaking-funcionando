const express = require('express');
const router = express.Router();
const controller = require('./salesPage.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Todas as rotas requerem autenticação
router.use(protectUser);

// Criar página de vendas
router.post('/', asyncHandler(async (req, res) => {
    await controller.create(req, res);
}));

// Buscar página por ID
router.get('/:id', asyncHandler(async (req, res) => {
    await controller.findById(req, res);
}));

// Buscar página por profile_item_id
router.get('/item/:itemId', asyncHandler(async (req, res) => {
    await controller.findByProfileItemId(req, res);
}));

// Atualizar página
router.put('/:id', asyncHandler(async (req, res) => {
    await controller.update(req, res);
}));

// Publicar página
router.patch('/:id/publish', asyncHandler(async (req, res) => {
    await controller.publish(req, res);
}));

// Pausar página
router.patch('/:id/pause', asyncHandler(async (req, res) => {
    await controller.pause(req, res);
}));

// Arquivar página
router.patch('/:id/archive', asyncHandler(async (req, res) => {
    await controller.archive(req, res);
}));

// Deletar página
router.delete('/:id', asyncHandler(async (req, res) => {
    await controller.delete(req, res);
}));

module.exports = router;

