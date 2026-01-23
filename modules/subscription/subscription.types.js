/**
 * Tipos e constantes para o módulo de Subscription
 */

const SUBSCRIPTION_TYPES = {
    MONTHLY: 'monthly',
    ANNUAL: 'annual'
};

const PAYMENT_METHODS = {
    PIX: 'pix',
    CARD: 'card'
};

const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
    FREE: 'free'
};

module.exports = {
    SUBSCRIPTION_TYPES,
    PAYMENT_METHODS,
    SUBSCRIPTION_STATUS
};
