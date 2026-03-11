/**
 * Controller: assinatura (info, planos admin, atualizar plano, planos públicos).
 */
const service = require('./assinatura.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getInfo(req, res) {
    try {
        const data = await service.getSubscriptionInfo(req.user.userId);
        if (!data) return responseFormatter.error(res, 'Usuário não encontrado.', 404);
        return res.status(200).json(data);
    } catch (err) {
        logger.error('Erro ao buscar informações de assinatura:', err);
        return responseFormatter.error(res, 'Erro ao buscar informações de assinatura.', 500);
    }
}

async function getPlans(req, res) {
    try {
        const result = await service.getPlansForAdmin(req.user.userId);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.status(200).json(result);
    } catch (err) {
        logger.error('Erro ao buscar planos:', err);
        return responseFormatter.error(res, 'Erro ao buscar planos.', 500);
    }
}

async function putPlan(req, res) {
    const planId = parseInt(req.params.id, 10);
    if (isNaN(planId)) return responseFormatter.error(res, 'ID do plano inválido.', 400);
    try {
        const result = await service.updatePlan(req.user.userId, planId, req.body || {});
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.status(200).json({
            message: 'Plano atualizado com sucesso.',
            plan: result.plan,
            modulesUpdated: result.modulesUpdated,
        });
    } catch (err) {
        logger.error('Erro ao atualizar plano:', err);
        return responseFormatter.error(res, 'Erro ao atualizar plano.', 500);
    }
}

async function getPlansPublic(req, res) {
    try {
        const result = await service.getPlansPublic();
        return res.status(200).json({ success: true, plans: result.plans });
    } catch (err) {
        logger.error('Erro ao buscar planos públicos:', err);
        return responseFormatter.error(res, 'Erro ao buscar planos públicos.', 500);
    }
}

module.exports = {
    getInfo,
    getPlans,
    putPlan,
    getPlansPublic,
};
