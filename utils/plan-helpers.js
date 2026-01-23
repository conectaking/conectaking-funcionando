/**
 * Helpers para verificação de planos e limites
 */

const db = require('../db');
const logger = require('./logger');

/**
 * Buscar plano atual do usuário
 */
async function getUserPlan(userId) {
    try {
        // Buscar informações do usuário
        const userResult = await db.query(`
            SELECT 
                u.id,
                u.account_type,
                u.subscription_id,
                u.subscription_status
            FROM users u
            WHERE u.id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return null;
        }

        const user = userResult.rows[0];

        // Se tiver subscription_id, buscar plano específico
        if (user.subscription_id) {
            const planResult = await db.query(`
                SELECT 
                    sp.*
                FROM subscription_plans sp
                WHERE sp.id = $1 AND sp.is_active = true
            `, [user.subscription_id]);

            if (planResult.rows.length > 0) {
                return planResult.rows[0];
            }
        }

        // Mapear account_type para plan_code (fallback)
        let planCode = user.account_type || 'basic';
        
        // Mapear planos antigos para novos
        if (user.account_type === 'business_owner') {
            planCode = 'king_corporate';
        } else if (user.account_type === 'individual_com_logo') {
            // ATUALIZADO: individual_com_logo agora mapeia para king_corporate
            planCode = 'king_corporate';
        } else if (user.account_type === 'individual') {
            planCode = 'basic';
        }
        
        // Se account_type já for um plan_code válido, usar diretamente
        const validPlanCodes = ['basic', 'premium', 'enterprise', 'king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate'];
        if (!validPlanCodes.includes(planCode)) {
            planCode = 'basic'; // Fallback seguro
        }

        // Buscar plano por código
        const planResult = await db.query(`
            SELECT *
            FROM subscription_plans
            WHERE plan_code = $1 AND is_active = true
            LIMIT 1
        `, [planCode]);

        return planResult.rows[0] || null;
    } catch (error) {
        logger.error('Erro ao buscar plano do usuário:', error);
        return null;
    }
}

/**
 * Obter limite de perfis financeiros do usuário
 */
async function getUserFinanceProfilesLimit(userId) {
    try {
        const plan = await getUserPlan(userId);
        
        if (!plan || !plan.features) {
            // Padrão: 1 perfil (apenas principal)
            return 1;
        }

        const maxProfiles = plan.features.max_finance_profiles;
        return maxProfiles ? parseInt(maxProfiles) : 1;
    } catch (error) {
        logger.error('Erro ao obter limite de perfis financeiros:', error);
        return 1; // Padrão seguro
    }
}

/**
 * Verificar se usuário pode criar mais perfis financeiros
 */
async function canCreateFinanceProfile(userId) {
    try {
        // Verificar se usuário é admin (dono) - admins não têm limite
        const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        const isAdmin = userResult.rows[0]?.is_admin === true;
        
        if (isAdmin) {
            // Admin pode criar quantos perfis quiser
            return {
                canCreate: true,
                currentCount: 0,
                limit: Infinity,
                remaining: Infinity
            };
        }
        
        const limit = await getUserFinanceProfilesLimit(userId);
        
        // Contar perfis ativos do usuário
        const profilesResult = await db.query(`
            SELECT COUNT(*) as count
            FROM finance_profiles
            WHERE user_id = $1 AND is_active = TRUE
        `, [userId]);

        const currentCount = parseInt(profilesResult.rows[0]?.count || 0);
        
        return {
            canCreate: currentCount < limit,
            currentCount,
            limit,
            remaining: Math.max(0, limit - currentCount)
        };
    } catch (error) {
        logger.error('Erro ao verificar se pode criar perfil:', error);
        return {
            canCreate: false,
            currentCount: 0,
            limit: 1,
            remaining: 0
        };
    }
}

/**
 * Buscar planos de upgrade disponíveis para gestão financeira
 */
async function getFinanceUpgradePlans() {
    try {
        const result = await db.query(`
            SELECT 
                sp.id,
                sp.plan_code,
                sp.plan_name,
                sp.price,
                sp.description,
                sp.features,
                COALESCE(fwc.whatsapp_number, sp.whatsapp_number) as whatsapp_number,
                COALESCE(fwc.whatsapp_message, sp.whatsapp_message) as whatsapp_message,
                sp.pix_key
            FROM subscription_plans sp
            LEFT JOIN finance_whatsapp_config fwc ON sp.plan_code = fwc.plan_code
            WHERE sp.is_active = TRUE 
            AND (sp.features->>'has_finance_module' = 'true' OR sp.features->>'max_finance_profiles' > '1')
            ORDER BY sp.price ASC
        `);

        return result.rows;
    } catch (error) {
        logger.error('Erro ao buscar planos de upgrade:', error);
        return [];
    }
}

module.exports = {
    getUserPlan,
    getUserFinanceProfilesLimit,
    canCreateFinanceProfile,
    getFinanceUpgradePlans
};
