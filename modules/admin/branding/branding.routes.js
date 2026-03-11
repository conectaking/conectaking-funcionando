/**
 * Rotas admin: logomarca padrão. Só delega ao controller.
 */
const express = require('express');
const { protectAdmin } = require('../../../middleware/protectAdmin');
const controller = require('./branding.controller');

const router = express.Router();

router.get('/default-branding', protectAdmin, controller.getDefaultBranding);
router.put('/default-branding', protectAdmin, controller.putDefaultBranding);

module.exports = router;
