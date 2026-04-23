/**
 * Códigos em `subscription_plans.plan_code` podem espelhar `account_type_enum`
 * (ex.: king_start, king_prime). A tabela `module_plan_availability` usa os códigos
 * canónicos (basic, premium, …). Sem esta normalização, o menu do dashboard esconde
 * módulos que existem no plano King Start.
 */

const SUBSCRIPTION_PLAN_CODE_TO_MODULE_PLAN_CODE = Object.freeze({
    king_start: 'basic',
    king_prime: 'premium',
    individual: 'basic',
    individual_com_logo: 'premium',
    business_owner: 'king_corporate',
    enterprise: 'king_corporate',
    king_essential: 'king_base',
    team_member: 'basic',
    abm: 'adm_principal'
});

/**
 * @param {string|null|undefined} planCode
 * @returns {string|null|undefined}
 */
function normalizePlanCodeForModuleAvailability(planCode) {
    if (planCode == null || planCode === '') return planCode;
    const k = String(planCode).trim().toLowerCase();
    return SUBSCRIPTION_PLAN_CODE_TO_MODULE_PLAN_CODE[k] || k;
}

module.exports = {
    normalizePlanCodeForModuleAvailability,
    SUBSCRIPTION_PLAN_CODE_TO_MODULE_PLAN_CODE
};
