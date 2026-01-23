/**
 * Controller para rotas de Assinatura
 */

const service = require('./subscription.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class SubscriptionController {
    /**
     * GET /api/subscription/info
     * Buscar informações da assinatura do usuário
     */
    async getInfo(req, res) {
        try {
            const userId = req.user.userId;
            const billingType = req.query.billingType || 'monthly';

            const data = await service.getUserSubscriptionInfo(userId, billingType);

            res.json(data);
        } catch (error) {
            logger.error('Erro ao buscar informações de assinatura:', error);
            throw error;
        }
    }

    /**
     * GET /api/subscription/plans
     * Buscar todos os planos (apenas admin)
     */
    async getPlans(req, res) {
        try {
            const plans = await service.getAllPlans();
            res.json({ plans });
        } catch (error) {
            logger.error('Erro ao buscar planos:', error);
            throw error;
        }
    }

    /**
     * GET /api/subscription/plans-public
     * Buscar planos disponíveis (público)
     */
    async getPlansPublic(req, res) {
        try {
            const billingType = req.query.billingType || 'monthly';
            const plans = await service.getAllPlans();
            const enrichedPlans = service.enrichPlans(plans, billingType);

            res.json({
                success: true,
                plans: enrichedPlans
            });
        } catch (error) {
            logger.error('Erro ao buscar planos públicos:', error);
            throw error;
        }
    }

    /**
     * PUT /api/subscription/plans/:id
     * Atualizar plano (apenas admin)
     */
    async updatePlan(req, res) {
        try {
            const userId = req.user.userId;
            const planId = parseInt(req.params.id, 10);
            const updateData = req.body;

            const updatedPlan = await service.updatePlan(userId, planId, updateData);

            res.json({
                message: 'Plano atualizado com sucesso.',
                plan: updatedPlan
            });
        } catch (error) {
            logger.error('Erro ao atualizar plano:', error);
            throw error;
        }
    }

    /**
     * POST /api/subscription/plans
     * Criar novo plano (apenas admin)
     */
    async createPlan(req, res) {
        try {
            const userId = req.user.userId;
            const planData = req.body;

            const newPlan = await service.createPlan(userId, planData);

            res.status(201).json({
                message: 'Plano criado com sucesso.',
                plan: newPlan
            });
        } catch (error) {
            logger.error('Erro ao criar plano:', error);
            throw error;
        }
    }
}

module.exports = new SubscriptionController();
