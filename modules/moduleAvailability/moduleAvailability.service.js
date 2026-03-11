/**
 * Service: disponibilidade de módulos por plano.
 * Orquestra repository e regras de negócio (mapeamento account_type -> plan_code, montagem de payloads).
 */
const repo = require('./moduleAvailability.repository');
const logger = require('../../utils/logger');

const ACCOUNT_TYPE_TO_PLAN_CODE = {
    individual: 'basic',
    individual_com_logo: 'premium',
    basic: 'basic',
    king_start: 'basic',
    premium: 'premium',
    king_prime: 'premium',
    business_owner: 'king_corporate',
    enterprise: 'king_corporate',
    king_base: 'king_base',
    king_essential: 'king_base',
    king_finance: 'king_finance',
    king_finance_plus: 'king_finance_plus',
    king_premium_plus: 'king_premium_plus',
    king_corporate: 'king_corporate',
    free: 'free',
    adm_principal: 'adm_principal',
    abm: 'adm_principal',
    team_member: 'basic'
};

const PLAN_CODE_MAP_FALLBACK = {
    basic: 'basic',
    premium: 'premium',
    enterprise: 'enterprise',
    king_base: 'king_base',
    king_finance: 'king_finance',
    king_finance_plus: 'king_finance_plus',
    king_premium_plus: 'king_premium_plus',
    king_corporate: 'king_corporate',
    individual: 'basic',
    individual_com_logo: 'premium',
    business_owner: 'enterprise',
    free: 'free'
};

const EQUIVALENT_PLAN_MAP = {
    basic: 'king_base',
    premium: 'king_premium_plus',
    enterprise: 'king_corporate',
    individual: 'king_base',
    individual_com_logo: 'king_premium_plus',
    business_owner: 'king_corporate'
};

function buildModulesMapFromRows(rows) {
    const modulesMap = {};
    rows.forEach(row => {
        if (!modulesMap[row.module_type]) {
            modulesMap[row.module_type] = { module_type: row.module_type, plans: {} };
        }
        modulesMap[row.module_type].plans[row.plan_code] = { is_available: row.is_available, id: row.id };
    });
    return modulesMap;
}

async function getPlanAvailabilityPublic(client) {
    const rows = await repo.getPlanAvailabilityPublic(client);
    const modulesMap = buildModulesMapFromRows(rows);
    return { modules: Object.values(modulesMap) };
}

async function getPlanAvailability(client, userId) {
    const user = await repo.getUserById(client, userId);
    if (!user || !user.is_admin) {
        return { forbidden: true };
    }
    const activePlans = await repo.getActivePlans(client);
    const planCodes = activePlans.map(p => p.plan_code);
    const allModuleTypes = await repo.getAllModuleTypes(client);
    const rows = await repo.getPlanAvailabilityForPlans(client, allModuleTypes, planCodes);
    const modulesMap = {};
    allModuleTypes.forEach(moduleType => {
        modulesMap[moduleType] = { module_type: moduleType, plans: {} };
        activePlans.forEach(plan => {
            modulesMap[moduleType].plans[plan.plan_code] = { is_available: false, id: null };
        });
    });
    rows.forEach(row => {
        if (modulesMap[row.module_type] && modulesMap[row.module_type].plans[row.plan_code]) {
            modulesMap[row.module_type].plans[row.plan_code] = {
                is_available: row.is_available === true,
                id: row.id
            };
        }
    });
    logger.debug(`Módulos carregados: ${Object.keys(modulesMap).length} tipos, ${rows.length} registros`);
    return {
        plans: activePlans.map(row => ({
            plan_code: row.plan_code,
            plan_name: row.plan_name,
            price: parseFloat(row.price)
        })),
        modules: Object.values(modulesMap)
    };
}

async function updatePlanAvailability(client, userId, updates) {
    const user = await repo.getUserById(client, userId);
    if (!user || !user.is_admin) {
        return { forbidden: true };
    }
    if (!Array.isArray(updates) || updates.length === 0) {
        return { badRequest: true, message: 'Lista de atualizações inválida.' };
    }
    let updatedCount = 0;
    let createdCount = 0;
    for (let i = 0; i < updates.length; i++) {
        const { module_type, plan_code, is_available } = updates[i];
        if (!module_type || typeof module_type !== 'string') {
            throw new Error(`module_type inválido no update ${i + 1}`);
        }
        if (!plan_code || typeof plan_code !== 'string') {
            throw new Error(`plan_code inválido no update ${i + 1}`);
        }
        if (typeof is_available !== 'boolean') {
            throw new Error(`is_available deve ser boolean no update ${i + 1}`);
        }
        const existing = await repo.findAvailabilityRow(client, module_type, plan_code);
        if (existing) {
            await repo.updateAvailability(client, module_type, plan_code, is_available);
            updatedCount++;
        } else {
            await repo.insertAvailability(client, module_type, plan_code, is_available);
            createdCount++;
        }
    }
    return {
        message: 'Disponibilidade de módulos atualizada com sucesso.',
        updated: updates.length,
        updatedCount,
        createdCount
    };
}

async function getAvailableModules(client, userId, planCodeQuery) {
    let planCode, accountType;
    if (planCodeQuery) {
        planCode = ACCOUNT_TYPE_TO_PLAN_CODE[planCodeQuery] || planCodeQuery;
        accountType = planCodeQuery;
    } else {
        const user = await repo.getUserWithSubscription(client, userId);
        if (!user) return { notFound: true };
        accountType = user.account_type;
        if (user.subscription_id) {
            const plan = await repo.getPlanBySubscriptionId(client, user.subscription_id);
            if (plan && plan.is_active) {
                planCode = plan.plan_code;
            }
        }
        if (!planCode) planCode = ACCOUNT_TYPE_TO_PLAN_CODE[accountType] || accountType;
        if (!planCode) planCode = 'basic';
    }
    let availableModules = await repo.getAvailableModuleTypesByPlan(client, planCode);
    if (availableModules.length === 0) {
        logger.warn(`planCode=${planCode} não retornou nenhum módulo.`);
    }
    if (!planCodeQuery) {
        const exclusions = await repo.getIndividualExclusions(client, userId);
        const individualAdds = await repo.getIndividualAdds(client, userId);
        const exclusionSet = new Set(exclusions);
        const addSet = new Set(individualAdds);
        availableModules = [...new Set([...availableModules, ...addSet].filter(m => !exclusionSet.has(m)))].sort();
    }
    return {
        account_type: accountType,
        plan_code: planCode,
        available_modules: availableModules
    };
}

async function getIndividualPlans(client, userId) {
    const user = await repo.getUserById(client, userId);
    if (!user || !user.is_admin) return { forbidden: true };
    const exists = await repo.tableExists(client, 'individual_user_plans');
    if (!exists) return { plans: [] };
    const plans = await repo.getIndividualPlansList(client);
    return { plans };
}

async function getUsersList(client, userId) {
    const user = await repo.getUserById(client, userId);
    if (!user || !user.is_admin) return { forbidden: true };
    const users = await repo.getUsersList(client);
    return { users };
}

async function resolvePlanCodeForUser(client, targetUserId) {
    const userWithSub = await repo.getUserWithSubscription(client, targetUserId);
    if (!userWithSub) return null;
    let planCode = userWithSub.account_type || 'free';
    if (userWithSub.subscription_id) {
        const planRow = await repo.getPlanBySubscriptionId(client, userWithSub.subscription_id);
        if (planRow && planRow.is_active) planCode = planRow.plan_code;
    }
    const availablePlanCodes = await repo.getAvailablePlanCodes(client);
    if (availablePlanCodes.includes(planCode)) return planCode;
    const mapped = PLAN_CODE_MAP_FALLBACK[planCode];
    if (mapped && availablePlanCodes.includes(mapped)) return mapped;
    const equivalent = EQUIVALENT_PLAN_MAP[planCode];
    if (equivalent && availablePlanCodes.includes(equivalent)) return equivalent;
    if (availablePlanCodes.length > 0) return availablePlanCodes[0];
    return planCode;
}

async function getIndividualPlansForUser(client, adminUserId, targetUserId) {
    const admin = await repo.getUserById(client, adminUserId);
    if (!admin || !admin.is_admin) return { forbidden: true };
    const user = await repo.getUserForAdmin(client, targetUserId);
    if (!user) return { notFound: true };
    const individualModules = await repo.getIndividualModulesForUser(client, targetUserId);
    const excludedModules = await repo.getExcludedModulesForUser(client, targetUserId);
    const planCode = await resolvePlanCodeForUser(client, targetUserId);
    const allModuleTypes = await repo.getAllModuleTypes(client);
    const baseModules = await repo.getBaseModulesForPlan(client, planCode);
    const baseSet = new Set(baseModules);
    const exclusionSet = new Set(excludedModules);
    const allModules = allModuleTypes.map(moduleType => {
        const inBase = baseSet.has(moduleType);
        const isIndividual = individualModules.includes(moduleType);
        const isExcluded = exclusionSet.has(moduleType);
        const isActive = (inBase && !isExcluded) || isIndividual;
        return {
            module_type: moduleType,
            in_base_plan: inBase,
            is_individual: isIndividual,
            is_excluded: isExcluded,
            is_active: isActive
        };
    });
    let maxFinanceProfiles = null;
    const overrideRow = await repo.getMaxFinanceProfilesOverride(client, targetUserId);
    if (overrideRow) {
        maxFinanceProfiles = parseInt(overrideRow.max_finance_profiles, 10) || 1;
    }
    if (maxFinanceProfiles === null) {
        const planFeatures = await repo.getPlanFeatures(client, planCode);
        maxFinanceProfiles = planFeatures?.features?.max_finance_profiles != null
            ? parseInt(planFeatures.features.max_finance_profiles, 10) || 1
            : 1;
    }
    return {
        user,
        plan_code: planCode,
        modules: allModules,
        max_finance_profiles: Math.min(20, Math.max(1, maxFinanceProfiles)),
        can_edit_base_modules: true
    };
}

async function updateIndividualPlansForUser(client, adminUserId, targetUserId, body) {
    const admin = await repo.getUserById(client, adminUserId);
    if (!admin || !admin.is_admin) return { forbidden: true };
    const { modules, max_finance_profiles } = body;
    if (!Array.isArray(modules)) {
        return { badRequest: true, message: 'modules deve ser um array.' };
    }
    const userResult = await repo.getUserWithSubscription(client, targetUserId);
    if (!userResult) return { notFound: true };
    let planCode = userResult.account_type || 'free';
    if (userResult.subscription_id) {
        const plan = await repo.getPlanBySubscriptionId(client, userResult.subscription_id);
        if (plan && plan.is_active) planCode = plan.plan_code;
    }
    const baseModules = await repo.getBaseModulesForPlan(client, planCode);
    const baseSet = new Set(baseModules);
    const activeSet = new Set(modules);
    await repo.deleteIndividualPlansForUser(client, targetUserId);
    await repo.deleteIndividualExclusionsForUser(client, targetUserId);
    for (const moduleType of baseSet) {
        if (!activeSet.has(moduleType)) {
            await repo.insertExclusion(client, targetUserId, moduleType);
        }
    }
    for (const moduleType of activeSet) {
        if (!baseSet.has(moduleType)) {
            await repo.upsertIndividualPlan(client, targetUserId, moduleType, planCode);
        }
    }
    if (typeof max_finance_profiles === 'number' || (typeof max_finance_profiles === 'string' && max_finance_profiles !== '')) {
        const num = Math.min(20, Math.max(1, parseInt(max_finance_profiles, 10) || 1));
        await repo.upsertMaxFinanceProfiles(client, targetUserId, num);
    }
    return { message: 'Módulos atualizados com sucesso. Alterações em "Já no plano" e "Adicionar" foram salvas.' };
}

async function getConfigureModulesPage(adminUserId, targetUserId) {
    return { userId: targetUserId, userName: '', planName: '' };
}

module.exports = {
    getPlanAvailabilityPublic,
    getPlanAvailability,
    updatePlanAvailability,
    getAvailableModules,
    getIndividualPlans,
    getUsersList,
    getIndividualPlansForUser,
    updateIndividualPlansForUser,
    getConfigureModulesPage,
    requireAdmin: async (client, userId) => {
        const user = await repo.getUserById(client, userId);
        return user && user.is_admin;
    }
};
