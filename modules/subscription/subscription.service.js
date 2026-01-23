/**
 * Service para lógica de negócio de Assinaturas
 */

const repository = require('./subscription.repository');
const { PaymentOptions } = require('./subscription.types');

class SubscriptionService {
    /**
     * Calcular valores mensais conforme especificação
     */
    getMonthlyPrice(planCode, annualPrice) {
        const monthlyValues = {
            'basic': 70.00,              // King Start: R$ 70,00
            'premium': 100.00,           // King Prime: R$ 100,00
            'king_base': 100.00,        // King Essential: R$ 100,00
            'king_finance': 120.00,      // King Finance: proporcional
            'king_finance_plus': 140.00, // King Finance Plus: proporcional
            'king_premium_plus': 150.00, // King Premium Plus: proporcional
            'king_corporate': 150.00     // King Corporate: proporcional
        };

        return monthlyValues[planCode] || (annualPrice / 12);
    }

    /**
     * Enriquecer planos com informações de pagamento
     */
    enrichPlans(plans, billingType) {
        return plans.map(plan => {
            const basePrice = parseFloat(plan.price) || 0;
            const monthlyPrice = this.getMonthlyPrice(plan.plan_code, basePrice);

            let displayPrice;
            if (billingType === 'monthly') {
                displayPrice = monthlyPrice;
            } else {
                displayPrice = basePrice;
            }

            // Criar opções de pagamento
            const paymentOptions = new PaymentOptions(plan, billingType);
            const options = paymentOptions.getOptions();

            return {
                ...plan,
                billingType: billingType,
                displayPrice: displayPrice,
                monthlyPrice: monthlyPrice,
                paymentOptions: options
            };
        });
    }

    /**
     * Buscar informações completas de assinatura do usuário
     */
    async getUserSubscriptionInfo(userId, billingType = 'monthly') {
        const user = await repository.findUserById(userId);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const plans = await repository.findAllActivePlans();
        const enrichedPlans = this.enrichPlans(plans, billingType);

        // Determinar plano atual do usuário
        let currentPlan = null;
        if (user.account_type === 'free') {
            currentPlan = null;
        } else {
            // Mapear account_type para plan_code
            const accountTypeToPlanCode = {
                'individual': 'basic',
                'business_owner': 'king_corporate',
                'king_base': 'king_base',
                'king_finance': 'king_finance',
                'king_finance_plus': 'king_finance_plus',
                'king_premium_plus': 'king_premium_plus',
                'king_corporate': 'king_corporate'
            };

            const planCode = accountTypeToPlanCode[user.account_type] || 'basic';
            currentPlan = enrichedPlans.find(p => p.plan_code === planCode);
        }

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
            availablePlans: enrichedPlans,
            billingType: billingType
        };
    }

    /**
     * Buscar todos os planos (para admin)
     */
    async getAllPlans() {
        return await repository.findAllActivePlans();
    }

    /**
     * Atualizar plano (apenas admin)
     */
    async updatePlan(userId, planId, updateData) {
        const isAdmin = await repository.isAdmin(userId);
        if (!isAdmin) {
            throw new Error('Acesso negado. Apenas administradores podem editar planos.');
        }

        const plan = await repository.findPlanById(planId);
        if (!plan) {
            throw new Error('Plano não encontrado');
        }

        return await repository.updatePlan(planId, updateData);
    }

    /**
     * Criar novo plano (apenas admin)
     */
    async createPlan(userId, planData) {
        const isAdmin = await repository.isAdmin(userId);
        if (!isAdmin) {
            throw new Error('Acesso negado. Apenas administradores podem criar planos.');
        }

        return await repository.createPlan(planData);
    }
}

module.exports = new SubscriptionService();
