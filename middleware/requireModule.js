/**
 * Middleware que bloqueia acesso a rotas de módulo se o plano do usuário
 * não tiver esse módulo ativo na Separação de Pacotes (module_plan_availability).
 * Respeita subscription_id (plano da assinatura) e depois account_type.
 */

const db = require('../db');

const accountTypeToPlanCode = {
    'individual': 'basic',
    'individual_com_logo': 'premium',
    'basic': 'basic',
    'premium': 'premium',
    'business_owner': 'king_corporate',
    'enterprise': 'king_corporate',
    'king_base': 'king_base',
    'king_essential': 'king_essential',
    'king_finance': 'king_finance',
    'king_finance_plus': 'king_finance_plus',
    'king_premium_plus': 'king_premium_plus',
    'king_corporate': 'king_corporate',
    'free': 'free'
};

/**
 * Retorna middleware que exige que o plano do usuário tenha o módulo ativo.
 * Deve ser usado DEPOIS de protectUser.
 * @param {string} moduleType - 'finance' | 'contract' | 'agenda'
 */
function requireModule(moduleType) {
    return async function checkModuleAccess(req, res, next) {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: 'Não autenticado.' });
        }
        const userId = req.user.userId;

        try {
            // Admin pode acessar todos os módulos (gestão do sistema)
            const userRow = await db.query(
                'SELECT is_admin, account_type, subscription_id FROM users WHERE id = $1',
                [userId]
            );
            if (userRow.rows.length === 0) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }
            const user = userRow.rows[0];
            if (user.is_admin === true) {
                return next();
            }

            let planCode = null;
            if (user.subscription_id) {
                const planRow = await db.query(
                    'SELECT plan_code FROM subscription_plans WHERE id = $1 AND is_active = true',
                    [user.subscription_id]
                );
                if (planRow.rows.length > 0) {
                    planCode = planRow.rows[0].plan_code;
                }
            }
            if (!planCode) {
                planCode = accountTypeToPlanCode[user.account_type] || user.account_type;
            }

            const modRow = await db.query(
                `SELECT 1 FROM module_plan_availability 
                 WHERE plan_code = $1 AND module_type = $2 AND is_available = true`,
                [planCode, moduleType]
            );

            if (modRow.rows.length === 0) {
                return res.status(403).json({
                    message: 'Este módulo não está disponível no seu plano. Faça upgrade para acessar.',
                    code: 'MODULE_NOT_IN_PLAN'
                });
            }
            next();
        } catch (err) {
            console.error('requireModule error:', err);
            res.status(500).json({ message: 'Erro ao verificar acesso ao módulo.' });
        }
    };
}

module.exports = { requireModule };
