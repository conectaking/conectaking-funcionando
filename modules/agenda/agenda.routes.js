const express = require('express');
const router = express.Router();
const { protectAgenda } = require('../../middleware/protectAgenda');
const controller = require('./agenda.controller');

// Todas as rotas requerem autenticação
router.use(protectAgenda);

// Configurações
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

// Slots
router.get('/slots', controller.getSlots);
router.post('/slots', controller.createSlot);
router.delete('/slots/:id', controller.deleteSlot);

// Datas bloqueadas
router.get('/blocked-dates', controller.getBlockedDates);
router.post('/blocked-dates', controller.createBlockedDate);

// Agendamentos
router.get('/appointments', controller.getAppointments);
router.post('/appointments/:id/cancel', controller.cancelAppointment);

module.exports = router;
