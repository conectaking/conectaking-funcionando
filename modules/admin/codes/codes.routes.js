/**
 * Rotas admin: códigos de registro (listar, gerar, atualizar, auto-delete). Só delega ao controller.
 */
const express = require('express');
const { protectAdmin } = require('../../../middleware/protectAdmin');
const controller = require('./codes.controller');

const router = express.Router();

router.get('/codes', protectAdmin, controller.getCodes);
router.get('/codes/auto-delete-config', protectAdmin, controller.getAutoDeleteConfig);
router.post('/codes/auto-delete-config', protectAdmin, controller.postAutoDeleteConfig);
router.post('/codes/execute-auto-delete', protectAdmin, controller.postExecuteAutoDelete);
router.post('/codes/generate-manual', protectAdmin, controller.postGenerateManual);
router.post('/codes/generate-batch', protectAdmin, controller.postGenerateBatch);
router.put('/codes/:code', protectAdmin, controller.putCode);
router.delete('/codes/:code', protectAdmin, controller.deleteCode);
// Rota legada: POST /generate-code (sem prefixo /codes)
router.post('/generate-code', protectAdmin, controller.postGenerateCode);

module.exports = router;
