const db = require('../../db');
const logger = require('../../utils/logger');

class LinkLimitsRepository {
    /**
     * Buscar limite específico por módulo e plano
     */
    async findByModuleAndPlan(moduleType, planCode) {
        try {
            const result = await db.query(
                'SELECT * FROM module_link_limits WHERE module_type = $1 AND plan_code = $2',
                [moduleType, planCode]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Erro ao buscar limite por módulo e plano:', error);
            throw error;
        }
    }

    /**
     * Buscar todos os limites de um plano
     */
    async findByPlan(planCode) {
        try {
            const result = await db.query(
                'SELECT * FROM module_link_limits WHERE plan_code = $1 ORDER BY module_type',
                [planCode]
            );
            return result.rows;
        } catch (error) {
            logger.error('Erro ao buscar limites por plano:', error);
            throw error;
        }
    }

    /**
     * Buscar todos os limites de um módulo
     */
    async findByModule(moduleType) {
        try {
            const result = await db.query(
                'SELECT * FROM module_link_limits WHERE module_type = $1 ORDER BY plan_code',
                [moduleType]
            );
            return result.rows;
        } catch (error) {
            logger.error('Erro ao buscar limites por módulo:', error);
            throw error;
        }
    }

    /**
     * Buscar todos os limites
     */
    async findAll() {
        try {
            const result = await db.query(
                'SELECT * FROM module_link_limits ORDER BY plan_code, module_type'
            );
            return result.rows;
        } catch (error) {
            logger.error('Erro ao buscar todos os limites:', error);
            throw error;
        }
    }

    /**
     * Criar ou atualizar limite
     */
    async upsert(moduleType, planCode, maxLinks) {
        try {
            const result = await db.query(
                `INSERT INTO module_link_limits (module_type, plan_code, max_links, updated_at)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                 ON CONFLICT (module_type, plan_code)
                 DO UPDATE SET
                     max_links = EXCLUDED.max_links,
                     updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [moduleType, planCode, maxLinks]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Erro ao criar/atualizar limite:', error);
            throw error;
        }
    }

    /**
     * Atualizar múltiplos limites em lote
     */
    async bulkUpsert(limits) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const results = [];
            for (const limit of limits) {
                const result = await client.query(
                    `INSERT INTO module_link_limits (module_type, plan_code, max_links, updated_at)
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (module_type, plan_code)
                     DO UPDATE SET
                         max_links = EXCLUDED.max_links,
                         updated_at = CURRENT_TIMESTAMP
                     RETURNING *`,
                    [limit.module_type, limit.plan_code, limit.max_links]
                );
                results.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Erro ao atualizar limites em lote:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Deletar limite
     */
    async delete(moduleType, planCode) {
        try {
            const result = await db.query(
                'DELETE FROM module_link_limits WHERE module_type = $1 AND plan_code = $2 RETURNING *',
                [moduleType, planCode]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Erro ao deletar limite:', error);
            throw error;
        }
    }

    /**
     * Resetar limites de um plano (deletar todos)
     */
    async resetPlan(planCode) {
        try {
            const result = await db.query(
                'DELETE FROM module_link_limits WHERE plan_code = $1 RETURNING *',
                [planCode]
            );
            return result.rows;
        } catch (error) {
            logger.error('Erro ao resetar limites do plano:', error);
            throw error;
        }
    }

    /**
     * Contar links existentes de um usuário por tipo
     */
    async countUserLinksByType(userId, moduleType) {
        try {
            const result = await db.query(
                'SELECT COUNT(*) as count FROM profile_items WHERE user_id = $1 AND item_type = $2 AND is_active = true',
                [userId, moduleType]
            );
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error('Erro ao contar links do usuário:', error);
            throw error;
        }
    }

    /**
     * Buscar plano do usuário
     */
    async getUserPlanCode(userId) {
        try {
            const result = await db.query(
                `SELECT 
                    u.account_type,
                    u.subscription_id,
                    sp.plan_code,
                    sp.is_active as plan_is_active
                 FROM users u
                 LEFT JOIN subscription_plans sp ON u.subscription_id = sp.id::text
                 WHERE u.id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            
            // Prioridade 1: plano da assinatura (se ativo)
            if (user.subscription_id && user.plan_code && user.plan_is_active) {
                return user.plan_code;
            }

            // Prioridade 2: mapear account_type para plan_code
            const accountTypeToPlanCode = {
                'individual': 'basic',
                'individual_com_logo': 'premium',
                'basic': 'basic',
                'king_start': 'basic',
                'premium': 'premium',
                'king_prime': 'premium',
                'business_owner': 'king_corporate',
                'enterprise': 'king_corporate',
                'king_base': 'king_base',
                'king_essential': 'king_base',
                'king_finance': 'king_finance',
                'king_finance_plus': 'king_finance_plus',
                'king_premium_plus': 'king_premium_plus',
                'king_corporate': 'king_corporate',
                'free': 'free',
                'adm_principal': 'adm_principal',
                'abm': 'adm_principal',
                'team_member': 'basic'
            };

            return accountTypeToPlanCode[user.account_type] || 'basic';
        } catch (error) {
            logger.error('Erro ao buscar plano do usuário:', error);
            throw error;
        }
    }
}

module.exports = new LinkLimitsRepository();
