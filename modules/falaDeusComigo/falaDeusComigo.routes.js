const express = require('express');
const router = express.Router();
const controller = require('./falaDeusComigo.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Rotas protegidas (dashboard): config e CRUD de mensagens
router.get('/config/:itemId', protectUser, asyncHandler(controller.getConfig));
router.get('/:itemId/mensagens', protectUser, asyncHandler(controller.listMensagens));
router.post('/:itemId/mensagens', protectUser, asyncHandler(controller.createMensagem));
router.put('/:itemId/mensagens/:mensagemId', protectUser, asyncHandler(controller.updateMensagem));
router.delete('/:itemId/mensagens/:mensagemId', protectUser, asyncHandler(controller.deleteMensagem));

module.exports = router;
