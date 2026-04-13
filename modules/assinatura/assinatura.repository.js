/**
 * Repository: assinatura e planos (users subscription, subscription_plans, module_plan_availability).
 */
const db = require('../../db');

const PLANS_SELECT = `
    id, plan_code, plan_name, price, monthly_price, annual_price, description, features,
    whatsapp_number, whatsapp_message, pix_key, is_active,
    COALESCE(custom_included_modules, '') as custom_included_modules,
    COALESCE(custom_excluded_modules, '') as custom_excluded_modules
`;

async function getUserById(userId) {
    const { rows } = await db.query(
        `SELECT id, email, account_type, subscription_status, subscription_expires_at, subscription_id, created_at, is_admin
         FROM users WHERE id = $1`,
        [userId]
    );
    return rows[0] || null;
}

async function getActivePlans() {
    const { rows } = await db.query(`
        SELECT ${PLANS_SELECT}
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY COALESCE(monthly_price, price) ASC
    `);
    return rows;
}

async function getPlansForAdmin() {
    const { rows } = await db.query(`
        SELECT ${PLANS_SELECT}, created_at, updated_at
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY COALESCE(monthly_price, price) ASC
    `);
    return rows;
}

async function getPlanById(planId) {
    const { rows } = await db.query(
        `SELECT id, plan_code FROM subscription_plans WHERE id = $1`,
        [planId]
    );
    return rows[0] || null;
}

async function getPlanFullById(planId) {
    const { rows } = await db.query(
        `SELECT *, COALESCE(custom_included_modules, '') as custom_included_modules, COALESCE(custom_excluded_modules, '') as custom_excluded_modules
         FROM subscription_plans WHERE id = $1`,
        [planId]
    );
    return rows[0] || null;
}

async function isAdmin(userId) {
    const { rows } = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    return rows.length > 0 && rows[0].is_admin === true;
}

async function updatePlan(client, planId, updatePayload) {
    const fields = Object.keys(updatePayload).filter((k) => updatePayload[k] !== undefined);
    if (fields.length === 0) return null;
    const setClause = fields
        .map((f, i) => {
            if (f === 'features') return `features = $${i + 1}::jsonb`;
            return `${f} = $${i + 1}`;
        })
        .join(', ');
    const values = fields.map((f) => {
        const v = updatePayload[f];
        if (f === 'features') return typeof v === 'string' ? v : JSON.stringify(v || {});
        if (f === 'price' || f === 'monthly_price' || f === 'annual_price') return v != null ? parseFloat(v) : null;
        return v;
    });
    values.push(planId);
    const { rows } = await client.query(
        `UPDATE subscription_plans SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
    );
    return rows[0] || null;
}

const MODULE_NAME_TO_CODE = {
    Carrossel: 'carousel',
    'Loja Virtual': 'sales_page',
    'King Forms': 'digital_form',
    Portfólio: 'portfolio',
    Banner: 'banner',
    'Gestão Financeira': 'finance',
    Contratos: 'contract',
    'Agenda Inteligente': 'agenda',
    'Modo Empresa': 'modo_empresa',
    'King Docs': 'king_docs',
};

async function syncModuleAvailability(client, planCode, includedModules, excludedModules) {
    const includedList = includedModules && String(includedModules).trim()
        ? String(includedModules).split(',').map((m) => m.trim()).filter(Boolean)
        : [];
    const excludedList = excludedModules && String(excludedModules).trim()
        ? String(excludedModules).split(',').map((m) => m.trim()).filter(Boolean)
        : [];
    const includedSet = new Set(includedList);
    const excludedSet = new Set(excludedList);
    const allModuleNames = Object.keys(MODULE_NAME_TO_CODE);

    for (const moduleName of allModuleNames) {
        const moduleCode = MODULE_NAME_TO_CODE[moduleName];
        if (!moduleCode) continue;
        let isAvailable = false;
        if (includedSet.has(moduleName)) isAvailable = true;
        else if (excludedSet.has(moduleName)) isAvailable = false;
        else {
            const cur = await client.query(
                'SELECT is_available FROM module_plan_availability WHERE module_type = $1 AND plan_code = $2',
                [moduleCode, planCode]
            );
            isAvailable = cur.rows.length > 0 ? cur.rows[0].is_available : false;
        }
        const exists = await client.query(
            'SELECT id FROM module_plan_availability WHERE module_type = $1 AND plan_code = $2',
            [moduleCode, planCode]
        );
        if (exists.rows.length > 0) {
            await client.query(
                'UPDATE module_plan_availability SET is_available = $1, updated_at = CURRENT_TIMESTAMP WHERE module_type = $2 AND plan_code = $3',
                [isAvailable, moduleCode, planCode]
            );
        } else {
            await client.query(
                'INSERT INTO module_plan_availability (module_type, plan_code, is_available) VALUES ($1, $2, $3)',
                [moduleCode, planCode, isAvailable]
            );
        }
    }
}

module.exports = {
    getUserById,
    getActivePlans,
    getPlansForAdmin,
    getPlanById,
    getPlanFullById,
    isAdmin,
    updatePlan,
    syncModuleAvailability,
};
