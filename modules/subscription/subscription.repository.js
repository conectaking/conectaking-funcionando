/**
 * Repository para operações de banco de dados relacionadas a Assinaturas
 */

const db = require('../../db');

class SubscriptionRepository {
    /**
     * Buscar informações do usuário
     */
    async findUserById(userId) {
        const query = `
            SELECT 
                u.id,
                u.email,
                u.account_type,
                u.subscription_status,
                u.subscription_expires_at,
                u.subscription_id,
                u.created_at,
                u.is_admin
            FROM users u
            WHERE u.id = $1
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Buscar todos os planos ativos
     */
    async findAllActivePlans() {
        const query = `
            SELECT 
                id,
                plan_code,
                plan_name,
                price,
                description,
                features,
                whatsapp_number,
                whatsapp_message,
                pix_key,
                is_active,
                created_at,
                updated_at
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY price ASC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    /**
     * Buscar plano por ID
     */
    async findPlanById(planId) {
        const query = `
            SELECT *
            FROM subscription_plans
            WHERE id = $1
        `;
        const result = await db.query(query, [planId]);
        return result.rows[0] || null;
    }

    /**
     * Buscar plano por código
     */
    async findPlanByCode(planCode) {
        const query = `
            SELECT *
            FROM subscription_plans
            WHERE plan_code = $1 AND is_active = true
        `;
        const result = await db.query(query, [planCode]);
        return result.rows[0] || null;
    }

    /**
     * Atualizar plano
     */
    async updatePlan(planId, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'plan_name', 'price', 'description', 'features',
            'whatsapp_number', 'whatsapp_message', 'pix_key', 'is_active'
        ];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramIndex++}`);
                if (key === 'features' && typeof value === 'object') {
                    values.push(JSON.stringify(value));
                } else if (key === 'price') {
                    values.push(parseFloat(value));
                } else {
                    values.push(value);
                }
            }
        }

        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(planId);

        const query = `
            UPDATE subscription_plans 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Criar novo plano
     */
    async createPlan(planData) {
        const query = `
            INSERT INTO subscription_plans (
                plan_code, plan_name, price, description, features,
                whatsapp_number, whatsapp_message, pix_key, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            planData.plan_code,
            planData.plan_name,
            parseFloat(planData.price),
            planData.description,
            typeof planData.features === 'string' ? planData.features : JSON.stringify(planData.features || {}),
            planData.whatsapp_number || null,
            planData.whatsapp_message || null,
            planData.pix_key || null,
            planData.is_active !== undefined ? planData.is_active : true
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Verificar se usuário é admin
     */
    async isAdmin(userId) {
        const query = `
            SELECT is_admin
            FROM users
            WHERE id = $1
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0]?.is_admin || false;
    }
}

module.exports = new SubscriptionRepository();
