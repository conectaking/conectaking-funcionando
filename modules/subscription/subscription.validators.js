/**
 * Validadores para o módulo de Subscription
 */

const validators = {
    /**
     * Validar billing type
     */
    validateBillingType(billingType) {
        const validTypes = ['monthly', 'annual'];
        if (!validTypes.includes(billingType)) {
            return {
                isValid: false,
                errors: [`Tipo de cobrança inválido. Deve ser 'monthly' ou 'annual'.`]
            };
        }
        return { isValid: true };
    },

    /**
     * Validar método de pagamento
     */
    validatePaymentMethod(method) {
        const validMethods = ['pix', 'card'];
        if (!validMethods.includes(method)) {
            return {
                isValid: false,
                errors: [`Método de pagamento inválido. Deve ser 'pix' ou 'card'.`]
            };
        }
        return { isValid: true };
    }
};

module.exports = validators;
