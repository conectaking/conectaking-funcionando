/**
 * Repository: disponibilidade de módulos por plano (module_plan_availability, individual_user_plans, etc.).
 * Todos os métodos recebem client (obtido pelo controller/service) para permitir transações.
 */

const MODULE_TYPES_PUBLIC = [
    'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode', 'wifi',
    'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
    'spotify', 'linkedin', 'pinterest',
    'link', 'portfolio', 'banner', 'carousel',
    'youtube_embed', 'instagram_embed', 'sales_page', 'digital_form',
    'finance', 'agenda', 'contract',
    'modo_empresa', 'branding', 'photographer_site', 'bible', 'location',
    'recibos_orcamentos', 'kingbrief'
];

async function getPlanAvailabilityPublic(client) {
    const availabilityQuery = `
        SELECT mpa.id, mpa.module_type, mpa.plan_code, mpa.is_available, mpa.updated_at
        FROM module_plan_availability mpa
        WHERE mpa.module_type = ANY($1)
        ORDER BY mpa.module_type, mpa.plan_code
    `;
    const { rows } = await client.query(availabilityQuery, [MODULE_TYPES_PUBLIC]);
    return rows;
}

async function getActivePlans(client) {
    const { rows } = await client.query(`
        SELECT plan_code, plan_name, price
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY price ASC
    `);
    return rows;
}

async function getAllModuleTypes(client) {
    const { rows } = await client.query(`
        SELECT DISTINCT module_type FROM module_plan_availability ORDER BY module_type
    `);
    return rows.map(r => r.module_type);
}

async function getPlanAvailabilityForPlans(client, moduleTypes, planCodes) {
    const { rows } = await client.query(`
        SELECT mpa.id, mpa.module_type, mpa.plan_code, mpa.is_available, mpa.updated_at
        FROM module_plan_availability mpa
        WHERE mpa.module_type = ANY($1) AND mpa.plan_code = ANY($2)
        ORDER BY mpa.module_type, mpa.plan_code
    `, [moduleTypes, planCodes]);
    return rows;
}

async function findAvailabilityRow(client, moduleType, planCode) {
    const { rows } = await client.query(`
        SELECT id FROM module_plan_availability WHERE module_type = $1 AND plan_code = $2
    `, [moduleType, planCode]);
    return rows[0] || null;
}

async function updateAvailability(client, moduleType, planCode, isAvailable) {
    await client.query(`
        UPDATE module_plan_availability
        SET is_available = $1, updated_at = CURRENT_TIMESTAMP
        WHERE module_type = $2 AND plan_code = $3
    `, [isAvailable, moduleType, planCode]);
}

async function insertAvailability(client, moduleType, planCode, isAvailable) {
    await client.query(`
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        VALUES ($1, $2, $3)
    `, [moduleType, planCode, isAvailable]);
}

async function getUserById(client, userId) {
    const { rows } = await client.query(
        'SELECT id, is_admin FROM users WHERE id = $1',
        [userId]
    );
    return rows[0] || null;
}

async function getUserWithSubscription(client, userId) {
    const { rows } = await client.query(
        'SELECT account_type, subscription_id FROM users WHERE id = $1',
        [userId]
    );
    return rows[0] || null;
}

async function getPlanBySubscriptionId(client, subscriptionId) {
    const { rows } = await client.query(
        'SELECT plan_code, plan_name, is_active FROM subscription_plans WHERE id = $1',
        [subscriptionId]
    );
    return rows[0] || null;
}

async function getAvailableModuleTypesByPlan(client, planCode) {
    const { rows } = await client.query(`
        SELECT DISTINCT module_type
        FROM module_plan_availability
        WHERE plan_code = $1 AND is_available = true
        ORDER BY module_type
    `, [planCode]);
    return rows.map(r => r.module_type);
}

async function getIndividualExclusions(client, userId) {
    const { rows } = await client.query(
        'SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = $1',
        [userId]
    ).catch(() => ({ rows: [] }));
    return (rows || []).map(r => r.module_type);
}

async function getIndividualAdds(client, userId) {
    const { rows } = await client.query(
        'SELECT module_type FROM individual_user_plans WHERE user_id = $1',
        [userId]
    ).catch(() => ({ rows: [] }));
    return (rows || []).map(r => r.module_type);
}

async function tableExists(client, tableName) {
    const { rows } = await client.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables WHERE table_name = $1
        )
    `, [tableName]);
    return rows[0].exists;
}

async function getIndividualPlansList(client) {
    const { rows } = await client.query(`
        SELECT iup.id, iup.user_id, u.email as user_email, p.display_name as user_name,
               iup.module_type, iup.plan_code, iup.created_at, iup.updated_at
        FROM individual_user_plans iup
        JOIN users u ON iup.user_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ORDER BY iup.created_at DESC
    `);
    return rows;
}

async function getUsersList(client) {
    const { rows } = await client.query(`
        SELECT u.id, u.email, COALESCE(p.display_name, u.email) as name,
               u.account_type, u.subscription_status, u.subscription_expires_at,
               u.created_at, u.is_admin,
               CASE WHEN u.subscription_expires_at IS NULL THEN true
                    WHEN u.subscription_expires_at >= CURRENT_DATE THEN true ELSE false END as is_active
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ORDER BY COALESCE(p.display_name, u.email) ASC
    `);
    return rows;
}

async function getUserForAdmin(client, userId) {
    const { rows } = await client.query(`
        SELECT u.id, u.email, COALESCE(p.display_name, u.email) as name, u.account_type
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = $1
    `, [userId]);
    return rows[0] || null;
}

async function getIndividualModulesForUser(client, userId) {
    const { rows } = await client.query(
        'SELECT module_type FROM individual_user_plans WHERE user_id = $1',
        [userId]
    );
    return rows.map(r => r.module_type);
}

async function getExcludedModulesForUser(client, userId) {
    const { rows } = await client.query(
        'SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = $1'
    , [userId]).catch(() => ({ rows: [] }));
    return (rows || []).map(r => r.module_type);
}

async function getAvailablePlanCodes(client) {
    const { rows } = await client.query(`
        SELECT DISTINCT plan_code FROM module_plan_availability ORDER BY plan_code
    `);
    return rows.map(r => r.plan_code);
}

async function getBaseModulesForPlan(client, planCode) {
    const { rows } = await client.query(`
        SELECT module_type FROM module_plan_availability
        WHERE plan_code = $1 AND is_available = true
    `, [planCode]);
    return rows.map(r => r.module_type);
}

async function getPlanFeatures(client, planCode) {
    const { rows } = await client.query(
        'SELECT features FROM subscription_plans WHERE plan_code = $1 AND is_active = true LIMIT 1',
        [planCode]
    );
    return rows[0] || null;
}

async function getMaxFinanceProfilesOverride(client, userId) {
    const { rows } = await client.query(
        'SELECT max_finance_profiles FROM individual_user_finance_profiles WHERE user_id = $1',
        [userId]
    );
    return rows[0] || null;
}

async function deleteIndividualPlansForUser(client, userId) {
    await client.query('DELETE FROM individual_user_plans WHERE user_id = $1', [userId]);
}

async function deleteIndividualExclusionsForUser(client, userId) {
    await client.query('DELETE FROM individual_user_plan_exclusions WHERE user_id = $1', [userId]).catch(() => {});
}

async function insertExclusion(client, userId, moduleType) {
    await client.query(`
        INSERT INTO individual_user_plan_exclusions (user_id, module_type)
        VALUES ($1, $2)
        ON CONFLICT (user_id, module_type) DO NOTHING
    `, [userId, moduleType]).catch(() => {});
}

async function upsertIndividualPlan(client, userId, moduleType, planCode) {
    await client.query(`
        INSERT INTO individual_user_plans (user_id, module_type, plan_code)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, module_type) DO UPDATE SET updated_at = NOW()
    `, [userId, moduleType, planCode]);
}

async function upsertMaxFinanceProfiles(client, userId, max) {
    await client.query(`
        INSERT INTO individual_user_finance_profiles (user_id, max_finance_profiles, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET max_finance_profiles = $2, updated_at = NOW()
    `, [userId, max]);
}

module.exports = {
    getPlanAvailabilityPublic,
    getActivePlans,
    getAllModuleTypes,
    getPlanAvailabilityForPlans,
    findAvailabilityRow,
    updateAvailability,
    insertAvailability,
    getUserById,
    getUserWithSubscription,
    getPlanBySubscriptionId,
    getAvailableModuleTypesByPlan,
    getIndividualExclusions,
    getIndividualAdds,
    tableExists,
    getIndividualPlansList,
    getUsersList,
    getUserForAdmin,
    getIndividualModulesForUser,
    getExcludedModulesForUser,
    getAvailablePlanCodes,
    getBaseModulesForPlan,
    getPlanFeatures,
    getMaxFinanceProfilesOverride,
    deleteIndividualPlansForUser,
    deleteIndividualExclusionsForUser,
    insertExclusion,
    upsertIndividualPlan,
    upsertMaxFinanceProfiles
};
