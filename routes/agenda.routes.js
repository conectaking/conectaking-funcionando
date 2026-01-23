/**
 * Wrapper de rotas do módulo Agenda (Admin)
 * Apenas registra as rotas do módulo sob /api/agenda/*
 */

const express = require('express');
const router = express.Router();
const agendaModuleRoutes = require('../modules/agenda/agenda.routes');

router.use('/', agendaModuleRoutes);

module.exports = router;
