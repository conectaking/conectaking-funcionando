/**
 * Wrapper de rotas do módulo Financeiro
 * Apenas registra as rotas do módulo sob /api/finance/*
 */

const express = require('express');
const router = express.Router();
const financeModuleRoutes = require('../modules/finance/finance.routes');

router.use('/', financeModuleRoutes);

module.exports = router;
