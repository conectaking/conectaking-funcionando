/**
 * Service para gerenciamento de assinaturas
 * Centraliza toda a lógica de assinaturas e planos
 */

const db = require('../../db');
const logger = require('../../utils/logger');
const TYPES = require('./subscription.types');

class SubscriptionService {
    /**
     * Calcula valores de parcelamento com acréscimo de 20%
     * @param {number} basePrice - Preço base do plano
     * @param {number} installments - Número de parcelas (máximo 12)
     * @returns {Object} Objeto com valor total parcelado e valor por parcela
     */
    calculateInstallmentPrice(basePrice, installments = 12) {
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
     * Calcula preço anual com desconto
     * @param {number} monthlyPrice - Preço mensal
     * @param {number} discountPercentage - Percentual de desconto (padrão 20%)
     * @returns {Object} Objeto com preço anual e economia
     */
    calculateAnnualPrice(monthlyPrice, discountPercentage = 20) {
        const annualPrice = monthlyPrice * 12;
        const discount = annualPrice * (discountPercentage / 100);
        const finalAnnualPrice = annualPrice - discount;
        
        return {
            monthlyPrice: monthlyPrice,
            annualPrice: annualPrice,
            discount: discount,
            finalAnnualPrice: finalAnnualPrice,
            discountPercentage: discountPercentage,
            savings: discount
        };
    }

    /**
     * Adiciona informações de pagamento (Pix e parcelamento) aos planos
     * @param {Array} plans - Array de planos
     * @param {string} billingType - 'monthly' ou 'annual'
     * @returns {Array} Planos com informações de pagamento
     */
    enrichPlansWithPaymentInfo(plans, billingType = 'monthly') {
        return plans.map(plan => {
            const basePrice = parseFloat(plan.price) || 0;
            
            // O preço no banco é ANUAL, então:
            // - Se for mensal: divide por 12
            // - Se for anual: aplica desconto de 20%
            let displayPrice = basePrice;
            if (billingType === 'monthly') {
                // Valor mensal = valor anual / 12
                displayPrice = basePrice / 12;
            } else if (billingType === 'annual') {
                // Valor anual com desconto de 20%
                displayPrice = basePrice * 0.8;
            }
            
            const installmentInfo = this.calculateInstallmentPrice(displayPrice, 12);
            
            return {
                ...plan,
                billingType: billingType,
                displayPrice: displayPrice,
                paymentOptions: {
                    pix: {
                        method: 'PIX',
                        price: displayPrice,
                        label: 'Pix',
                        title: 'À vista',
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
    }

    /**
     * Buscar planos disponíveis
     * @param {boolean} includeInactive - Incluir planos inativos
     * @returns {Promise<Array>} Array de planos
     */
    async getAvailablePlans(includeInactive = false) {
        const client = await db.pool.connect();
        try {
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
                WHERE ${includeInactive ? '1=1' : 'is_active = true'}
                ORDER BY price ASC
            `;
            
            const result = await client.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Erro ao buscar planos disponíveis:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar informações de assinatura do usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<Object>} Informações da assinatura
     */
    async getUserSubscription(userId) {
        const client = await db.pool.connect();
        try {
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
                return null;
            }
            
            const user = userResult.rows[0];
            let currentPlan = null;
            
            // Buscar plano atual se tiver subscription_id
            if (user.subscription_id) {
                const planQuery = `
                    SELECT * FROM subscription_plans
                    WHERE id = $1 AND is_active = true
                `;
                const planResult = await client.query(planQuery, [user.subscription_id]);
                if (planResult.rows.length > 0) {
                    currentPlan = planResult.rows[0];
                }
            }
            
            // Buscar planos disponíveis
            const availablePlans = await this.getAvailablePlans(false);
            
            return {
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
                availablePlans: availablePlans
            };
        } catch (error) {
            logger.error('Erro ao buscar assinatura do usuário:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new SubscriptionService();
