const express = require('express');
const router = express.Router();
const controller = require('./contract.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Todas as rotas requerem autenticação
router.use(protectUser);

// Templates
router.get('/templates', asyncHandler(async (req, res) => {
    await controller.findTemplates(req, res);
}));

router.get('/templates/:id', asyncHandler(async (req, res) => {
    await controller.findTemplateById(req, res);
}));

// Contratos
router.get('/', asyncHandler(async (req, res) => {
    await controller.findByUserId(req, res);
}));

router.post('/', asyncHandler(async (req, res) => {
    await controller.create(req, res);
}));

router.get('/stats', asyncHandler(async (req, res) => {
    await controller.getStats(req, res);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    await controller.findById(req, res);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
    await controller.update(req, res);
}));

router.post('/:id/send', asyncHandler(async (req, res) => {
    await controller.sendForSignature(req, res);
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
    await controller.cancel(req, res);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
    await controller.delete(req, res);
}));

router.post('/:id/duplicate', asyncHandler(async (req, res) => {
    await controller.duplicate(req, res);
}));

router.get('/:id/audit', asyncHandler(async (req, res) => {
    await controller.getAuditLogs(req, res);
}));

module.exports = router;
