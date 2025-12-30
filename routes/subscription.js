const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/subscription/info - Buscar informações da assinatura do usuário
router.get('/info', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Buscar informações do usuário
        const userQuery = `
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
        const userResult = await client.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        const user = userResult.rows[0];
        
        // Buscar planos disponíveis
        const plansQuery = `
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
                is_active
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY price ASC
        `;
        const plansResult = await client.query(plansQuery);
        
        // Determinar qual plano o usuário tem baseado no account_type
        // Por enquanto, mapeamos:
        // - individual -> basic ou premium (precisaria de campo adicional para diferenciar)
        // - business_owner -> enterprise
        let currentPlan = null;
        if (user.account_type === 'individual') {
            // Por padrão, assumimos basic. Em produção, você pode adicionar um campo subscription_plan_code na tabela users
            currentPlan = plansResult.rows.find(p => p.plan_code === 'basic') || plansResult.rows[0];
        } else if (user.account_type === 'business_owner') {
            currentPlan = plansResult.rows.find(p => p.plan_code === 'enterprise') || plansResult.rows[2];
        } else if (user.account_type === 'free') {
            currentPlan = null; // Usuário free não tem plano
        }
        
        res.json({
            user: {
                id: user.id,
                email: user.email,
                accountType: user.account_type,
                subscriptionStatus: user.subscription_status,
                subscriptionExpiresAt: user.subscription_expires_at,
                subscriptionId: user.subscription_id,
                createdAt: user.created_at,
                isAdmin: user.is_admin
            },
            currentPlan: currentPlan,
            availablePlans: plansResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar informações de assinatura:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// GET /api/subscription/plans - Buscar todos os planos (ADM pode editar)
router.get('/plans', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar.' });
        }
        
        const plansQuery = `
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
            ORDER BY price ASC
        `;
        const plansResult = await client.query(plansQuery);
        
        res.json({
            plans: plansResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar planos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

// PUT /api/subscription/plans/:id - Atualizar plano (apenas ADM)
router.put('/plans/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const planId = parseInt(req.params.id, 10);
        const { plan_name, price, description, features, whatsapp_number, whatsapp_message, pix_key, is_active } = req.body;
        
        // Verificar se é admin
        const adminCheck = await client.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem editar planos.' });
        }
        
        // Verificar se plano existe
        const planCheck = await client.query('SELECT id FROM subscription_plans WHERE id = $1', [planId]);
        if (planCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Plano não encontrado.' });
        }
        
        // Construir query de atualização dinamicamente
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (plan_name !== undefined) {
            updateFields.push(`plan_name = $${paramIndex++}`);
            updateValues.push(plan_name);
        }
        if (price !== undefined) {
            updateFields.push(`price = $${paramIndex++}`);
            updateValues.push(parseFloat(price));
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            updateValues.push(description);
        }
        if (features !== undefined) {
            updateFields.push(`features = $${paramIndex++}`);
            updateValues.push(JSON.stringify(features));
        }
        if (whatsapp_number !== undefined) {
            updateFields.push(`whatsapp_number = $${paramIndex++}`);
            updateValues.push(whatsapp_number || null);
        }
        if (whatsapp_message !== undefined) {
            updateFields.push(`whatsapp_message = $${paramIndex++}`);
            updateValues.push(whatsapp_message || null);
        }
        if (pix_key !== undefined) {
            updateFields.push(`pix_key = $${paramIndex++}`);
            updateValues.push(pix_key || null);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            updateValues.push(is_active);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }
        
        // Adicionar updated_at
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Adicionar planId no final
        updateValues.push(planId);
        
        const updateQuery = `
            UPDATE subscription_plans 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, updateValues);
        
        res.json({
            message: 'Plano atualizado com sucesso.',
            plan: updateResult.rows[0]
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar plano:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;

