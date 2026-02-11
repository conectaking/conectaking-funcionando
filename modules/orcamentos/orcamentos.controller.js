const orcamentosService = require('./orcamentos.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function list(req, res) {
    try {
        const ticket = req.query.ticket || null;
        const status = req.query.status || null;
        const leads = await orcamentosService.list(req.user.userId, { ticket, status });
        return responseFormatter.success(res, { leads });
    } catch (e) {
        logger.error('orcamentos list:', e);
        return responseFormatter.error(res, e.message || 'Erro ao listar orçamentos', 500);
    }
}

async function getOne(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const lead = await orcamentosService.getOne(id, req.user.userId);
        if (!lead) return responseFormatter.error(res, 'Orçamento não encontrado', 404);
        return responseFormatter.success(res, lead);
    } catch (e) {
        logger.error('orcamentos getOne:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

async function updateStatus(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const status = (req.body || {}).status;
        if (!status) return responseFormatter.error(res, 'status é obrigatório', 400);
        const lead = await orcamentosService.updateStatus(id, req.user.userId, status);
        if (!lead) return responseFormatter.error(res, 'Orçamento não encontrado', 404);
        return responseFormatter.success(res, lead, 'Status atualizado.');
    } catch (e) {
        logger.error('orcamentos updateStatus:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

module.exports = {
    list,
    getOne,
    updateStatus
};
