const service = require('./agenda.service');
const repository = require('./agenda.repository');
const googleOAuthService = require('./google/googleOAuth.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class AgendaController {
    /**
     * Obter configurações
     */
    async getSettings(req, res) {
        try {
            const userId = req.user.userId;
            const settings = await service.getSettings(userId);
            return responseFormatter.success(res, settings);
        } catch (error) {
            logger.error('Erro ao obter configurações:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Atualizar configurações
     */
    async updateSettings(req, res) {
        try {
            const userId = req.user.userId;
            const settings = await service.updateSettings(userId, req.body);
            return responseFormatter.success(res, settings, 'Configurações atualizadas com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar configurações:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Listar slots
     */
    async getSlots(req, res) {
        try {
            const userId = req.user.userId;
            const isActive = req.query.isActive !== 'false';
            const slots = await service.findSlotsByOwnerId(userId, isActive);
            return responseFormatter.success(res, slots);
        } catch (error) {
            logger.error('Erro ao listar slots:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar slot
     */
    async createSlot(req, res) {
        try {
            const userId = req.user.userId;
            const slot = await service.createSlot(userId, req.body);
            return responseFormatter.success(res, slot, 'Slot criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar slot:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Deletar slot
     */
    async deleteSlot(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            await service.deleteSlot(id, userId);
            return responseFormatter.success(res, null, 'Slot deletado com sucesso');
        } catch (error) {
            logger.error('Erro ao deletar slot:', error);
            const statusCode = error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Listar datas bloqueadas
     */
    async getBlockedDates(req, res) {
        try {
            const userId = req.user.userId;
            const { dateFrom, dateTo } = req.query;
            const dates = await service.findBlockedDatesByOwnerId(userId, dateFrom, dateTo);
            return responseFormatter.success(res, dates);
        } catch (error) {
            logger.error('Erro ao listar datas bloqueadas:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar data bloqueada
     */
    async createBlockedDate(req, res) {
        try {
            const userId = req.user.userId;
            const blockedDate = await service.createBlockedDate(userId, req.body);
            return responseFormatter.success(res, blockedDate, 'Data bloqueada com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar data bloqueada:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Listar agendamentos
     */
    async getAppointments(req, res) {
        try {
            const userId = req.user.userId;
            const filters = {
                status: req.query.status || null,
                dateFrom: req.query.dateFrom || null,
                dateTo: req.query.dateTo || null,
                limit: req.query.limit ? parseInt(req.query.limit) : null
            };
            const appointments = await service.findAppointmentsByOwnerId(userId, filters);
            return responseFormatter.success(res, appointments);
        } catch (error) {
            logger.error('Erro ao listar agendamentos:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Cancelar agendamento
     */
    async cancelAppointment(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            await service.cancelAppointment(id, userId);
            return responseFormatter.success(res, null, 'Agendamento cancelado com sucesso');
        } catch (error) {
            logger.error('Erro ao cancelar agendamento:', error);
            const statusCode = error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }
}

module.exports = new AgendaController();
