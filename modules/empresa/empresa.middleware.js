/**
 * Middlewares do módulo Empresa: enriquecer user e proteger rotas (apenas dono/plano empresa).
 */
const db = require('../../db');

/**
 * Enriquecer req.user com is_admin, account_type e hasModoEmpresa do DB.
 * ADM sempre tem acesso ao modo empresa.
 */
async function enrichUserForBusiness(req, res, next) {
    if (!req.user || !req.user.userId) {
        return next();
    }
    try {
        const r = await db.query(
            'SELECT is_admin, account_type FROM users WHERE id = $1',
            [req.user.userId]
        );
        if (r.rows.length > 0) {
            req.user.is_admin = r.rows[0].is_admin;
            req.user.isAdmin = r.rows[0].is_admin === true;
            req.user.account_type = r.rows[0].account_type;
            req.user.accountType = r.rows[0].account_type;
        }
        const planCode = req.user.accountType || req.user.account_type;
        if (planCode) {
            const mod = await db.query(
                `SELECT 1 FROM module_plan_availability 
                 WHERE module_type = 'modo_empresa' AND plan_code = $1 AND is_available = true`,
                [planCode]
            );
            req.user.hasModoEmpresa = mod.rows.length > 0;
        } else {
            req.user.hasModoEmpresa = false;
        }
    } catch (e) {
        console.warn('enrichUserForBusiness:', e.message);
    }
    next();
}

/** Modo empresa: King Corporate, business_owner, enterprise, ou plano com modo_empresa. ADM tem acesso sempre. */
function protectBusinessOwner(req, res, next) {
    if (!req.user) {
        return res.status(403).json({ message: 'Acesso negado. Apenas para contas empresariais.' });
    }
    const accountType = req.user.accountType || req.user.account_type;
    const isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
    const hasEnterprise = accountType === 'business_owner' || accountType === 'king_corporate' || accountType === 'enterprise';
    const hasModoEmpresa = req.user.hasModoEmpresa === true;
    if (isAdmin || hasEnterprise || hasModoEmpresa) {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Apenas para contas empresariais (King Corporate), plano com Modo Empresa ou ADM.' });
    }
}

const planosComPersonalizarLogo = ['king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'business_owner', 'individual_com_logo', 'enterprise'];

/** Personalização de logo: planos com direito a logo (sem exigir Modo Empresa). */
function protectBusinessOwnerOrLogo(req, res, next) {
    if (!req.user) {
        return res.status(403).json({ message: 'Acesso negado. Faça login para personalizar o logo.' });
    }
    const accountType = req.user.accountType || req.user.account_type;
    const isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
    const allowed = planosComPersonalizarLogo.includes(accountType);
    if (isAdmin || allowed) {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. A personalização de logo está disponível apenas para os planos King Finance, King Finance Plus, King Premium Plus e King Corporate.' });
    }
}

module.exports = {
    enrichUserForBusiness,
    protectBusinessOwner,
    protectBusinessOwnerOrLogo,
};
