const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { protectAdmin } = require('../middleware/protectAdmin');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Calcula valores de parcelamento com acréscimo de 20%
 * @param {number} basePrice - Preço base do plano
 * @param {number} installments - Número de parcelas (máximo 12)
 * @returns {Object} Objeto com valor total parcelado e valor por parcela
 */
function calculateInstallmentPrice(basePrice, installments = 12) {
    const maxInstallments = Math.min(installments, 12);
    const totalWithIncrease = basePrice * 1.2; // Acréscimo de 20%
    const installmentValue = totalWithIncrease / maxInstallments;
    
    return {
        totalPrice: totalWithIncrease,
        installmentValue: installmentValue,
        installments: maxInstallments,
        basePrice: basePrice,
        increase: totalWithIncrease - basePrice,
        increasePercentage: 20
    };
}

/**
 * Adiciona informações de pagamento (Pix e parcelamento) aos planos
 * @param {Array} plans - Array de planos
 * @returns {Array} Planos com informações de pagamento
 */
function enrichPlansWithPaymentInfo(plans) {
    return plans.map(plan => {
        const price = parseFloat(plan.price) || 0;
        const installmentInfo = calculateInstallmentPrice(price, 12);
        
        return {
            ...plan,
            paymentOptions: {
                pix: {
                    method: 'PIX',
                    price: price,
                    label: 'Pix',
                    description: 'Pagamento à vista via Pix'
                },
                installment: {
                    method: 'CARTÃO',
                    totalPrice: installmentInfo.totalPrice,
                    installmentValue: installmentInfo.installmentValue,
                    installments: installmentInfo.installments,
                    label: `Até ${installmentInfo.installments}x`,
                    description: `Até ${installmentInfo.installments}x de R$ ${installmentInfo.installmentValue.toFixed(2).replace('.', ',')}`
                }
            }
        };
    });
}

// GET /api/subscription/info - Buscar informações da assinatura do usuário
// NOTA: Esta rota agora é gerenciada pelo módulo subscription, mas mantida aqui para compatibilidade
router.get('/info', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
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
        
        // Determinar qual plano o usuário tem baseado no account_type
        let currentPlan = null;
        if (user.account_type === 'individual') {
            currentPlan = plansResult.rows.find(p => p.plan_code === 'basic') || plansResult.rows[0];
        } else if (user.account_type === 'business_owner') {
            currentPlan = plansResult.rows.find(p => p.plan_code === 'enterprise') || plansResult.rows[2];
        } else if (user.account_type === 'free') {
            currentPlan = null;
        }
        
        // Enriquecer planos com informações de pagamento baseado no billingType
        // O preço no banco é ANUAL (R$ 700, R$ 1000, etc.)
        // - Se for mensal: usa o valor da parcela de 12x do anual (com acréscimo de 20%)
        // - Se for anual: usa o valor exato do banco
        const enrichedPlans = plansResult.rows.map(plan => {
            const basePrice = parseFloat(plan.price) || 0;
            let displayPrice = basePrice;
            
            if (billingType === 'monthly') {
                // Calcular valor da parcela de 12x do anual (com acréscimo de 20%)
                const annualWithIncrease = basePrice * 1.2; // Acréscimo de 20%
                displayPrice = annualWithIncrease / 12; // Valor mensal = parcela de 12x
            } else if (billingType === 'annual') {
                // Valor anual = valor exato do banco (R$ 700, R$ 1000, etc.)
                displayPrice = basePrice;
            }
            
            const installmentInfo = calculateInstallmentPrice(displayPrice, 12);
            
            return {
                ...plan,
                billingType: billingType,
                displayPrice: displayPrice,
                paymentOptions: {
                    pix: {
                        method: 'PIX',
                        price: displayPrice,
                        label: 'Pix',
                        title: 'À vista no Pix',
                        description: 'Pagamento à vista via Pix'
                    },
                    installment: {
                        method: 'CARTÃO',
                        totalPrice: installmentInfo.totalPrice,
                        installmentValue: installmentInfo.installmentValue,
                        installments: installmentInfo.installments,
                        label: `Até ${installmentInfo.installments}x`,
                        title: 'Até 12 meses',
                        description: `Até ${installmentInfo.installments}x de R$ ${installmentInfo.installmentValue.toFixed(2).replace('.', ',')}`
                    }
                }
            };
        });
        
        const enrichedCurrentPlan = currentPlan ? enrichedPlans.find(p => p.id === currentPlan.id) || (() => {
            const basePrice = parseFloat(currentPlan.price) || 0;
            let displayPrice = basePrice;
            if (billingType === 'monthly') {
                displayPrice = basePrice / 12;
            } else if (billingType === 'annual') {
                displayPrice = basePrice * 0.8;
            }
            const installmentInfo = calculateInstallmentPrice(displayPrice, 12);
            return {
                ...currentPlan,
                billingType: billingType,
                displayPrice: displayPrice,
                paymentOptions: {
                    pix: { method: 'PIX', price: displayPrice, label: 'Pix', title: 'À vista no Pix' },
                    installment: { method: 'CARTÃO', totalPrice: installmentInfo.totalPrice, installmentValue: installmentInfo.installmentValue, installments: 12, label: 'Até 12x', title: 'Até 12 meses' }
                }
            };
        })() : null;
        
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
            currentPlan: enrichedCurrentPlan,
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
        
        // Enriquecer planos com informações de pagamento
        const enrichedPlans = enrichPlansWithPaymentInfo(plansResult.rows);
        
        res.json({
            plans: enrichedPlans
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
// NOTA: Esta rota agora é gerenciada pelo módulo subscription, mas mantida aqui para compatibilidade
router.get('/plans-public', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const billingType = req.query.billingType || 'monthly';
        
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
        // O preço no banco é ANUAL (R$ 700, R$ 1000, etc.)
        // - Se for mensal: usa o valor da parcela de 12x do anual (com acréscimo de 20%)
        // - Se for anual: usa o valor exato do banco
        const enrichedPlans = plansResult.rows.map(plan => {
            const basePrice = parseFloat(plan.price) || 0;
            let displayPrice = basePrice;
            
            if (billingType === 'monthly') {
                // Calcular valor da parcela de 12x do anual (com acréscimo de 20%)
                const annualWithIncrease = basePrice * 1.2; // Acréscimo de 20%
                displayPrice = annualWithIncrease / 12; // Valor mensal = parcela de 12x
            } else if (billingType === 'annual') {
                // Valor anual = valor exato do banco (R$ 700, R$ 1000, etc.)
                displayPrice = basePrice;
            }
            
            const installmentInfo = calculateInstallmentPrice(displayPrice, 12);
            
            return {
                ...plan,
                billingType: billingType,
                displayPrice: displayPrice,
                paymentOptions: {
                    pix: {
                        method: 'PIX',
                        price: displayPrice,
                        label: 'Pix',
                        title: 'À vista no Pix',
                        description: 'Pagamento à vista via Pix'
                    },
                    installment: {
                        method: 'CARTÃO',
                        totalPrice: installmentInfo.totalPrice,
                        installmentValue: installmentInfo.installmentValue,
                        installments: installmentInfo.installments,
                        label: `Até ${installmentInfo.installments}x`,
                        title: 'Até 12 meses',
                        description: `Até ${installmentInfo.installments}x de R$ ${installmentInfo.installmentValue.toFixed(2).replace('.', ',')}`
                    }
                }
            };
        });
        
        res.json({
            success: true,
            plans: enrichedPlans,
            billingType: billingType
        });
    } catch (error) {
        console.error('❌ Erro ao buscar planos públicos:', error);
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;

