const service = require('./linkLimits.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class LinkLimitsController {
    /**
     * Listar todos os limites (admin)
     */
    async getAll(req, res) {
        try {
            const limits = await service.getAllLimits();
            return responseFormatter.success(res, limits);
        } catch (error) {
            logger.error('Erro ao listar limites:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Obter limites do usuário atual
     */
    async getUserLimits(req, res) {
        try {
            const userId = req.user.userId;
            const limits = await service.getUserLinkLimits(userId);
            return responseFormatter.success(res, limits);
        } catch (error) {
            logger.error('Erro ao obter limites do usuário:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Verificar se pode adicionar mais links
     */
    async checkLimit(req, res) {
        try {
            const userId = req.user.userId;
            const { moduleType } = req.params;

            if (!moduleType) {
                return responseFormatter.error(res, 'moduleType é obrigatório', 400);
            }

            const result = await service.checkLinkLimit(userId, moduleType);
            return responseFormatter.success(res, result);
        } catch (error) {
            logger.error('Erro ao verificar limite:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Criar ou atualizar limite (admin)
     */
    async upsert(req, res) {
        try {
            const { module_type, plan_code, max_links } = req.body;

            if (!module_type || !plan_code) {
                return responseFormatter.error(res, 'module_type e plan_code são obrigatórios', 400);
            }

            const limit = await service.upsertLimit(module_type, plan_code, max_links);
            return responseFormatter.success(res, limit, 'Limite atualizado com sucesso');
        } catch (error) {
            logger.error('Erro ao criar/atualizar limite:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Atualizar múltiplos limites em lote (admin)
     */
    async bulkUpdate(req, res) {
        try {
            const { limits } = req.body;

            if (!limits || !Array.isArray(limits)) {
                return responseFormatter.error(res, 'limits deve ser um array', 400);
            }

            const results = await service.bulkUpdateLimits(limits);
            return responseFormatter.success(res, results, 'Limites atualizados com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar limites em lote:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Resetar limites de um plano (admin)
     */
    async resetPlan(req, res) {
        try {
            const { plan_code } = req.body;

            if (!plan_code) {
                return responseFormatter.error(res, 'plan_code é obrigatório', 400);
            }

            const results = await service.resetPlanLimits(plan_code);
            return responseFormatter.success(res, results, 'Limites resetados com sucesso');
        } catch (error) {
            logger.error('Erro ao resetar limites do plano:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Copiar limites de um plano para outro (admin)
     */
    async copyPlan(req, res) {
        try {
            const { source_plan_code, target_plan_code } = req.body;

            if (!source_plan_code || !target_plan_code) {
                return responseFormatter.error(res, 'source_plan_code e target_plan_code são obrigatórios', 400);
            }

            const results = await service.copyPlanLimits(source_plan_code, target_plan_code);
            return responseFormatter.success(res, results, 'Limites copiados com sucesso');
        } catch (error) {
            logger.error('Erro ao copiar limites:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Obter estatísticas (admin)
     */
    async getStats(req, res) {
        try {
            const stats = await service.getStats();
            return responseFormatter.success(res, stats);
        } catch (error) {
            logger.error('Erro ao obter estatísticas:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }
}

module.exports = new LinkLimitsController();
