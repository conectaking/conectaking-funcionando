/**
 * Tipos e interfaces para o módulo de Assinatura
 */

/**
 * Tipo de cobrança
 */
const BillingType = {
    MONTHLY: 'monthly',
    ANNUAL: 'annual'
};

/**
 * Método de pagamento
 */
const PaymentMethod = {
    PIX: 'PIX',
    CARD: 'CARD'
};

/**
 * Opções de pagamento para um plano
 */
class PaymentOptions {
    constructor(plan, billingType) {
        this.plan = plan;
        this.billingType = billingType;
        this.calculateOptions();
    }

    calculateOptions() {
        const basePrice = parseFloat(this.plan.price) || 0;
        const planCode = this.plan.plan_code;

        // Valores mensais fixos conforme especificação
        const monthlyValues = {
            'basic': 70.00,        // King Start: R$ 70,00
            'premium': 100.00,     // King Prime: R$ 100,00
            'king_base': 100.00,   // King Essential: R$ 100,00
            'king_finance': 120.00, // King Finance: proporcional
            'king_finance_plus': 140.00, // King Finance Plus: proporcional
            'king_premium_plus': 150.00, // King Premium Plus: proporcional
            'king_corporate': 150.00 // King Corporate: proporcional
        };

        let displayPrice;
        let monthlyPrice;

        if (this.billingType === 'monthly') {
            // Valor mensal fixo conforme especificação
            monthlyPrice = monthlyValues[planCode] || (basePrice / 12);
            displayPrice = monthlyPrice;
        } else {
            // Valor anual = valor do banco
            displayPrice = basePrice;
            monthlyPrice = monthlyValues[planCode] || (basePrice / 12);
        }

        // Valor total para parcelamento em 12x
        const totalForInstallments = monthlyPrice * 12;
        const installmentValue = monthlyPrice;

        // King Start: apenas PIX
        if (planCode === 'basic') {
            this.options = {
                pix: {
                    method: 'PIX',
                    price: displayPrice,
                    label: 'Pix',
                    title: 'À vista no Pix',
                    description: this.billingType === 'monthly' 
                        ? `R$ ${displayPrice.toFixed(2).replace('.', ',')} por mês`
                        : `R$ ${displayPrice.toFixed(2).replace('.', ',')} à vista`
                }
            };
        } else {
            // Outros planos: PIX + Cartão 12x
            this.options = {
                pix: {
                    method: 'PIX',
                    price: displayPrice,
                    label: 'Pix',
                    title: 'À vista no Pix',
                    description: this.billingType === 'monthly'
                        ? `R$ ${displayPrice.toFixed(2).replace('.', ',')} por mês`
                        : `R$ ${displayPrice.toFixed(2).replace('.', ',')} à vista`
                },
                installment: {
                    method: 'CARTÃO',
                    totalPrice: totalForInstallments,
                    installmentValue: installmentValue,
                    installments: 12,
                    label: '12x',
                    title: '12x no cartão',
                    description: `12x de R$ ${installmentValue.toFixed(2).replace('.', ',')}`
                }
            };
        }
    }

    getOptions() {
        return this.options;
    }
}

module.exports = {
    BillingType,
    PaymentMethod,
    PaymentOptions
};
