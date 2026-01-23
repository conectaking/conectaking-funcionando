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
        
        // Obter billingType da query string (monthly ou annual)
        const billingType = req.query.billingType || 'monthly';
        
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
        
        // Enriquecer planos com informações de pagamento baseado no billingType
        // Valores mensais fixos conforme especificação do usuário
        const monthlyValues = {
            'basic': 70.00,              // King Start: R$ 70,00/mês
            'premium': 100.00,           // King Prime: R$ 100,00/mês
            'king_base': 150.00,        // King Essential/Alta: R$ 150,00/mês
            'king_finance': 120.00,      // King Finance: proporcional
            'king_finance_plus': 140.00, // King Finance Plus: proporcional
            'king_premium_plus': 150.00, // King Premium Plus: R$ 150,00/mês
            'king_corporate': 150.00     // King Corporate: R$ 150,00/mês
        };
        
        // Valores anuais (com 20% de desconto aplicado)
        // Fórmula: (valor_mensal * 12) * 0.8 = valor_anual_com_desconto
        const annualValues = {
            'basic': (70 * 12) * 0.8,              // King Start: R$ 672,00/ano
            'premium': (100 * 12) * 0.8,           // King Prime: R$ 960,00/ano
            'king_base': (150 * 12) * 0.8,        // King Essential: R$ 1.440,00/ano
            'king_finance': (120 * 12) * 0.8,      // King Finance: R$ 1.152,00/ano
            'king_finance_plus': (140 * 12) * 0.8, // King Finance Plus: R$ 1.344,00/ano
            'king_premium_plus': (150 * 12) * 0.8, // King Premium Plus: R$ 1.440,00/ano
            'king_corporate': (150 * 12) * 0.8     // King Corporate: R$ 1.440,00/ano
        };

        const enrichedPlans = plansResult.rows.map(plan => {
            const planCode = plan.plan_code;
            const monthlyPrice = monthlyValues[planCode] || 0;
            const annualPrice = annualValues[planCode] || 0;
            
            let displayPrice;
            if (billingType === 'monthly') {
                // Valor mensal fixo conforme especificação
                displayPrice = monthlyPrice;
            } else {
                // Valor anual com 20% de desconto
                displayPrice = annualPrice;
            }
            
            // Valor total para parcelamento em 12x (apenas no modo mensal)
            const totalForInstallments = monthlyPrice * 12;
            const installmentValue = monthlyPrice;
            
            // King Start: apenas PIX (sem cartão)
            if (planCode === 'basic') {
                return {
                    ...plan,
                    billingType: billingType,
                    displayPrice: displayPrice,
                    monthlyPrice: monthlyPrice,
                    annualPrice: annualPrice,
                    paymentOptions: {
                        pix: {
                            method: 'PIX',
                            price: displayPrice,
                            label: billingType === 'annual' ? 'no Pix' : 'Pix',
                            title: billingType === 'annual' ? 'no Pix' : 'À vista no Pix',
                            description: billingType === 'monthly'
                                ? `R$ ${displayPrice.toFixed(2).replace('.', ',')} por mês`
                                : `R$ ${displayPrice.toFixed(2).replace('.', ',')} no Pix`
                        }
                    }
                };
            } else {
                // Outros planos: PIX + Cartão 12x (apenas no modo mensal)
                const paymentOptions = {
                    pix: {
                        method: 'PIX',
                        price: displayPrice,
                        label: billingType === 'annual' ? 'no Pix' : 'Pix',
                        title: billingType === 'annual' ? 'no Pix' : 'À vista no Pix',
                        description: billingType === 'monthly'
                            ? `R$ ${displayPrice.toFixed(2).replace('.', ',')} por mês`
                            : `R$ ${displayPrice.toFixed(2).replace('.', ',')} no Pix`
                    }
                };
                
                // Adicionar opção de cartão apenas no modo mensal
                if (billingType === 'monthly') {
                    paymentOptions.installment = {
                        method: 'CARTÃO',
                        totalPrice: totalForInstallments,
                        installmentValue: installmentValue,
                        installments: 12,
                        label: '12x',
                        title: '12x no cartão',
                        description: `12x de R$ ${installmentValue.toFixed(2).replace('.', ',')}`
                    };
                }
                
                return {
                    ...plan,
                    billingType: billingType,
                    displayPrice: displayPrice,
                    monthlyPrice: monthlyPrice,
                    annualPrice: annualPrice,
                    paymentOptions: paymentOptions
                };
            }
        });
        
        // Determinar qual plano o usuário tem baseado no account_type
        const accountTypeToPlanCode = {
            'individual': 'basic',
            'business_owner': 'king_corporate',
            'basic': 'basic',
            'premium': 'premium',
            'king_base': 'king_base',
            'king_finance': 'king_finance',
            'king_finance_plus': 'king_finance_plus',
            'king_premium_plus': 'king_premium_plus',
            'king_corporate': 'king_corporate',
            'enterprise': 'king_corporate'
        };
        
        let currentPlan = null;
        if (user.account_type === 'free') {
            currentPlan = null; // Usuário free não tem plano
        } else {
            const planCode = accountTypeToPlanCode[user.account_type] || 'basic';
            currentPlan = enrichedPlans.find(p => p.plan_code === planCode);
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
            availablePlans: enrichedPlans,
            billingType: billingType
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
            WHERE is_active = true
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
            // Se features já é string, usar diretamente; se for objeto, fazer stringify
            const featuresValue = typeof features === 'string' ? features : JSON.stringify(features);
            updateValues.push(featuresValue);
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

// GET /api/subscription/plans-public - Buscar planos disponíveis (público, sem autenticação)
router.get('/plans-public', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
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
        
        res.json({
            success: true,
            plans: plansResult.rows
        });
    } catch (error) {
        console.error('❌ Erro ao buscar planos públicos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;

