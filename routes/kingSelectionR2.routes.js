/**
 * Rotas R2 do King Selection (inventário + limpeza).
 * Montadas em /api/king-selection antes do router principal.
 */
const express = require('express');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const r2Service = require('../services/kingSelectionR2.service');

const router = express.Router();

router.get('/r2-ping', (req, res) => {
  res.json({
    success: true,
    feature: 'r2-inventory',
    version: '2026-05-19-r2',
    workerConfigured: r2Service.isWorkerConfigured()
  });
});

router.get('/r2-inventory', protectUser, asyncHandler(async (req, res) => {
  try {
    const data = await r2Service.buildR2InventoryForUser(req.user.userId);
    res.json(data);
  } catch (e) {
    const code = e.status || 500;
    res.status(code).json({ message: e.message || 'Erro ao carregar inventário R2' });
  }
}));

router.post('/cleanup-r2', protectUser, asyncHandler(async (req, res) => {
  const rawDry = req.body?.dryRun ?? req.query?.dryRun ?? '1';
  const dryRun = rawDry === false || rawDry === 0 || String(rawDry).toLowerCase() === '0' || String(rawDry).toLowerCase() === 'false'
    ? false
    : true;
  const confirm = String(req.body?.confirm ?? req.query?.confirm ?? '').trim().toUpperCase();
  try {
    const data = await r2Service.runCleanupR2({ dryRun, confirm });
    res.json(data);
  } catch (e) {
    const code = e.status || 500;
    res.status(code).json({ message: e.message || 'Erro na limpeza R2', dryRun: true });
  }
}));

module.exports = router;
