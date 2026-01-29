const repository = require('./linkLimits.repository');
const validators = require('./linkLimits.validators');
const TYPES = require('./linkLimits.types');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

class LinkLimitsService {
    /**
     * Verificar se usuário pode adicionar mais links de um tipo
     * @param {number} userId - ID do usuário
     * @param {string} moduleType - Tipo do módulo
     * @returns {Promise<Object>} { allowed: boolean, current: number, limit: number | null, message: string }
     */
    async checkLinkLimit(userId, moduleType) {
        try {
            // Buscar plano do usuário
            const planCode = await repository.getUserPlanCode(userId);
            if (!planCode) {
                logger.warn(`Plano não encontrado para usuário ${userId}`);
                return {
                    allowed: true,
                    current: 0,
                    limit: null,
                    message: 'Plano não encontrado, permitindo criação'
                };
            }

            // Buscar limite (com cache)
            const limit = await this.getPlanModuleLimit(planCode, moduleType);
            
            // Se não há limite configurado (NULL), permitir
            if (limit === null) {
                return {
                    allowed: true,
                    current: 0,
                    limit: null,
                    message: 'Limite não configurado (ilimitado)'
                };
            }

            // Contar links existentes do usuário
            const currentCount = await repository.countUserLinksByType(userId, moduleType);

            // Verificar se pode adicionar mais
            const allowed = currentCount < limit;

            return {
                allowed,
                current: currentCount,
                limit,
                message: allowed 
                    ? `Você pode adicionar mais ${limit - currentCount} link(s) deste tipo`
                    : `Limite atingido: ${currentCount}/${limit} links`
            };
        } catch (error) {
            logger.error('Erro ao verificar limite de links:', error);
            // Em caso de erro, permitir criação para não bloquear usuário
            return {
                allowed: true,
                current: 0,
                limit: null,
                message: 'Erro ao verificar limite, permitindo criação'
            };
        }
    }

    /**
     * Obter todos os limites do usuário atual
     * @param {number} userId - ID do usuário
     * @returns {Promise<Object>} Objeto com limites por módulo
     */
    async getUserLinkLimits(userId) {
        try {
            const planCode = await repository.getUserPlanCode(userId);
            if (!planCode) {
                return {};
            }

            const limits = await this.getPlanLimits(planCode);
            
            // Contar links existentes do usuário para cada tipo
            const userLimits = {};
            for (const limit of limits) {
                const currentCount = await repository.countUserLinksByType(userId, limit.module_type);
                userLimits[limit.module_type] = {
                    limit: limit.max_links,
                    current: currentCount,
                    remaining: limit.max_links === null ? null : Math.max(0, limit.max_links - currentCount)
                };
            }

            return userLimits;
        } catch (error) {
            logger.error('Erro ao obter limites do usuário:', error);
            return {};
        }
    }

    /**
     * Obter limite de um módulo para um plano (com cache)
     * @param {string} planCode - Código do plano
     * @param {string} moduleType - Tipo do módulo
     * @returns {Promise<number|null>} Limite ou null se ilimitado
     */
    async getPlanModuleLimit(planCode, moduleType) {
        const cacheKey = `${TYPES.CACHE_PREFIX.MODULE_PLAN_LIMIT}${planCode}:${moduleType}`;
        
        // Tentar buscar do cache
        if (cache) {
            const cached = cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        // Buscar do banco
        const limitRecord = await repository.findByModuleAndPlan(moduleType, planCode);
        const limit = limitRecord ? limitRecord.max_links : null;

        // Armazenar no cache
        if (cache) {
            cache.set(cacheKey, limit, TYPES.CACHE_TTL);
        }

        return limit;
    }

    /**
     * Obter todos os limites de um plano (com cache)
     * @param {string} planCode - Código do plano
     * @returns {Promise<Array>} Array de limites
     */
    async getPlanLimits(planCode) {
        const cacheKey = `${TYPES.CACHE_PREFIX.PLAN_LIMITS}${planCode}`;
        
        // Tentar buscar do cache
        if (cache) {
            const cached = cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        // Buscar do banco
        const limits = await repository.findByPlan(planCode);

        // Armazenar no cache
        if (cache) {
            cache.set(cacheKey, limits, TYPES.CACHE_TTL);
        }

        return limits;
    }

    /**
     * Obter todos os limites (admin)
     */
    async getAllLimits() {
        return await repository.findAll();
    }

    /**
     * Criar ou atualizar limite
     */
    async upsertLimit(moduleType, planCode, maxLinks) {
        // Validar
        const validation = validators.validateLimitData({ module_type: moduleType, plan_code: planCode, max_links: maxLinks });
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Sanitizar
        const sanitized = validators.sanitize({ module_type: moduleType, plan_code: planCode, max_links: maxLinks });

        // Criar/atualizar
        const result = await repository.upsert(sanitized.module_type, sanitized.plan_code, sanitized.max_links);

        // Invalidar cache
        this.invalidateCache(sanitized.plan_code, sanitized.module_type);

        return result;
    }

    /**
     * Atualizar múltiplos limites em lote
     */
    async bulkUpdateLimits(limits) {
        // Validar
        const validation = validators.validateBulkUpdateData({ limits });
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Sanitizar
        const sanitized = limits.map(limit => validators.sanitize(limit));

        // Atualizar em lote
        const results = await repository.bulkUpsert(sanitized);

        // Invalidar cache de todos os planos afetados
        const affectedPlans = [...new Set(sanitized.map(l => l.plan_code))];
        affectedPlans.forEach(planCode => {
            this.invalidateCache(planCode);
        });

        return results;
    }

    /**
     * Resetar limites de um plano
     */
    async resetPlanLimits(planCode) {
        const results = await repository.resetPlan(planCode);
        
        // Invalidar cache
        this.invalidateCache(planCode);

        return results;
    }

    /**
     * Copiar limites de um plano para outro
     */
    async copyPlanLimits(sourcePlanCode, targetPlanCode) {
        const sourceLimits = await repository.findByPlan(sourcePlanCode);
        
        const newLimits = sourceLimits.map(limit => ({
            module_type: limit.module_type,
            plan_code: targetPlanCode,
            max_links: limit.max_links
        }));

        const results = await repository.bulkUpsert(newLimits);

        // Invalidar cache do plano destino
        this.invalidateCache(targetPlanCode);

        return results;
    }

    /**
     * Invalidar cache
     */
    invalidateCache(planCode, moduleType = null) {
        if (!cache) return;

        if (moduleType) {
            // Invalidar cache específico de módulo/plano
            const cacheKey = `${TYPES.CACHE_PREFIX.MODULE_PLAN_LIMIT}${planCode}:${moduleType}`;
            cache.delete(cacheKey);
        }

        // Invalidar cache do plano completo
        const planCacheKey = `${TYPES.CACHE_PREFIX.PLAN_LIMITS}${planCode}`;
        cache.delete(planCacheKey);
    }

    /**
     * Obter sugestão de upgrade quando limite atingido
     */
    async getUpgradeSuggestion(userId, moduleType) {
        try {
            const planCode = await repository.getUserPlanCode(userId);
            if (!planCode) {
                return null;
            }

            // Buscar todos os planos disponíveis
            const db = require('../../db');
            const plansResult = await db.query(
                'SELECT plan_code, plan_name, price FROM subscription_plans WHERE is_active = true ORDER BY price ASC'
            );

            // Buscar limite atual
            const currentLimit = await this.getPlanModuleLimit(planCode, moduleType);

            // Encontrar planos com limite maior
            const betterPlans = [];
            for (const plan of plansResult.rows) {
                const planLimit = await this.getPlanModuleLimit(plan.plan_code, moduleType);
                
                // Se o plano tem limite maior ou ilimitado
                if (planLimit === null || (currentLimit !== null && planLimit > currentLimit)) {
                    betterPlans.push({
                        plan_code: plan.plan_code,
                        plan_name: plan.plan_name,
                        price: parseFloat(plan.price),
                        new_limit: planLimit
                    });
                }
            }

            // Retornar o plano mais barato com limite melhor
            if (betterPlans.length > 0) {
                return betterPlans.sort((a, b) => a.price - b.price)[0];
            }

            return null;
        } catch (error) {
            logger.error('Erro ao obter sugestão de upgrade:', error);
            return null;
        }
    }

    /**
     * Obter estatísticas de uso (admin)
     */
    async getStats() {
        // Implementar estatísticas se necessário
        return {
            total_limits: 0,
            plans_with_limits: 0,
            modules_with_limits: 0
        };
    }
}

module.exports = new LinkLimitsService();
