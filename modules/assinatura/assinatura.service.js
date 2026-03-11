/**
 * Service: assinatura e planos (info do usuário, plano atual, listar/atualizar planos).
 */
const db = require('../../db');
const repository = require('./assinatura.repository');

const ACCOUNT_TYPE_TO_PLAN_CODE = {
    individual: 'basic',
    individual_com_logo: 'premium',
    basic: 'basic',
    premium: 'premium',
    business_owner: 'king_corporate',
    enterprise: 'king_corporate',
    king_base: 'king_base',
    king_essential: 'king_essential',
    king_finance: 'king_finance',
    king_finance_plus: 'king_finance_plus',
    king_premium_plus: 'king_premium_plus',
    king_corporate: 'king_corporate',
};

function normalizePlanCustomFields(plan) {
    if (!plan) return plan;
    return {
        ...plan,
        custom_included_modules: plan.custom_included_modules != null ? plan.custom_included_modules : '',
        custom_excluded_modules: plan.custom_excluded_modules != null ? plan.custom_excluded_modules : '',
    };
}

function resolveCurrentPlan(user, availablePlans) {
    if (!user || !availablePlans || availablePlans.length === 0) return null;
    if (user.subscription_id) {
        const byId = availablePlans.find((p) => p.id === user.subscription_id);
        if (byId) return byId;
    }
    const planCode = ACCOUNT_TYPE_TO_PLAN_CODE[user.account_type];
    if (planCode) {
        const byCode = availablePlans.find((p) => p.plan_code === planCode);
        if (byCode) return byCode;
    }
    if (user.account_type) {
        const direct = availablePlans.find((p) => p.plan_code === user.account_type);
        if (direct) return direct;
    }
    if (user.account_type !== 'free') return availablePlans[0] || null;
    return null;
}

async function getSubscriptionInfo(userId) {
    const user = await repository.getUserById(userId);
    if (!user) return null;
    const availablePlans = await repository.getActivePlans();
    const currentPlan = resolveCurrentPlan(user, availablePlans);
    return {
        user: {
            id: user.id,
            email: user.email,
            accountType: user.account_type,
            subscriptionStatus: user.subscription_status,
            subscriptionExpiresAt: user.subscription_expires_at,
            subscriptionId: user.subscription_id,
            createdAt: user.created_at,
            isAdmin: user.is_admin,
        },
        currentPlan: currentPlan ? normalizePlanCustomFields(currentPlan) : null,
        availablePlans: (availablePlans || []).map(normalizePlanCustomFields),
    };
}

async function getPlansForAdmin(userId) {
    const ok = await repository.isAdmin(userId);
    if (!ok) return { error: 'Acesso negado. Apenas administradores podem acessar.', status: 403 };
    const rows = await repository.getPlansForAdmin();
    const filtered = (rows || []).filter((p) => p.plan_code !== 'adm_principal' && p.plan_code !== 'abm');
    return { plans: filtered.map(normalizePlanCustomFields) };
}

async function updatePlan(userId, planId, body) {
    const ok = await repository.isAdmin(userId);
    if (!ok) return { error: 'Acesso negado. Apenas administradores podem editar planos.', status: 403 };
    const plan = await repository.getPlanById(planId);
    if (!plan) return { error: 'Plano não encontrado.', status: 404 };
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const updated = await repository.updatePlan(client, planId, body);
        if (body.included_modules !== undefined || body.excluded_modules !== undefined) {
            await repository.syncModuleAvailability(
                client,
                plan.plan_code,
                body.included_modules,
                body.excluded_modules
            );
        }
        await client.query('COMMIT');
        const full = await repository.getPlanFullById(planId);
        return {
            plan: normalizePlanCustomFields(full),
            modulesUpdated: body.included_modules !== undefined || body.excluded_modules !== undefined,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function getPlansPublic() {
    const rows = await repository.getActivePlans();
    const filtered = (rows || []).filter((p) => p.plan_code !== 'adm_principal' && p.plan_code !== 'abm');
    return { plans: filtered.map(normalizePlanCustomFields) };
}

module.exports = {
    getSubscriptionInfo,
    getPlansForAdmin,
    updatePlan,
    getPlansPublic,
};
