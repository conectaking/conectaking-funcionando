/**
 * Controller: Visão Geral do admin. Extrai req, chama service, formata resposta.
 */
const service = require('./overview.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function getStats(req, res) {
    try {
        const data = await service.getStats();
        return responseFormatter.success(res, data);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas do admin:', error);
        return responseFormatter.error(res, 'Erro no servidor ao buscar estatísticas.', 500);
    }
}

async function getAdvancedStats(req, res) {
    try {
        const data = await service.getAdvancedStats();
        return responseFormatter.success(res, data);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas avançadas:', error);
        return responseFormatter.error(res, 'Erro no servidor ao buscar estatísticas avançadas.', 500);
    }
}

async function getAnalyticsUsers(req, res) {
    try {
        const rows = await service.getAnalyticsUsers();
        return responseFormatter.success(res, rows);
    } catch (error) {
        logger.error('Erro ao buscar analytics de usuários:', error);
        return responseFormatter.error(res, 'Erro ao buscar analytics de usuários.', 500);
    }
}

async function getAnalyticsUserDetails(req, res) {
    const { userId } = req.params;
    const period = parseInt(req.query.period || '30', 10);
    if (isNaN(period) || period < 1 || period > 365) {
        return responseFormatter.error(res, 'Período inválido. Deve ser entre 1 e 365 dias.', 400);
    }
    try {
        const data = await service.getAnalyticsUserDetails(userId, period);
        return responseFormatter.success(res, data);
    } catch (error) {
        logger.error('Erro ao buscar detalhes de analytics do usuário:', error);
        return responseFormatter.error(res, 'Erro ao buscar detalhes de analytics.', 500);
    }
}

async function getPlans(req, res) {
    try {
        const rows = await service.getPlans();
        return responseFormatter.success(res, rows);
    } catch (err) {
        logger.error('Erro GET /api/admin/plans:', err);
        return responseFormatter.error(res, 'Erro ao listar planos.', 500);
    }
}

async function patchPlan(req, res) {
    const planId = parseInt(req.params.id, 10);
    const body = req.body || {};
    if (isNaN(planId)) {
        return responseFormatter.error(res, 'ID do plano inválido.', 400);
    }
    if (!('kingbrief_minutes_per_month' in body)) {
        return responseFormatter.error(res, 'Envie kingbrief_minutes_per_month (número ou null para ilimitado).', 400);
    }
    const raw = body.kingbrief_minutes_per_month;
    const minutes = (raw === null || raw === '' || raw === undefined) ? null : Math.max(0, parseInt(raw, 10));
    try {
        const updated = await service.updatePlanKingBrief(planId, minutes);
        if (!updated) {
            return responseFormatter.error(res, 'Plano não encontrado.', 404);
        }
        return responseFormatter.success(res, updated, 'Plano atualizado.');
    } catch (err) {
        logger.error('Erro PATCH /api/admin/plans/:id:', err);
        return responseFormatter.error(res, 'Erro ao atualizar plano.', 500);
    }
}

module.exports = {
    getStats,
    getAdvancedStats,
    getAnalyticsUsers,
    getAnalyticsUserDetails,
    getPlans,
    patchPlan,
};
