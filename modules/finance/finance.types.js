// Tipos e constantes para o módulo Financeiro

module.exports = {
    TRANSACTION_TYPE: {
        INCOME: 'INCOME',
        EXPENSE: 'EXPENSE'
    },
    
    TRANSACTION_STATUS: {
        PENDING: 'PENDING',
        PAID: 'PAID'
    },
    
    ACCOUNT_TYPE: {
        BANK: 'BANK',
        CASH: 'CASH',
        PIX: 'PIX',
        WALLET: 'WALLET'
    },
    
    RECURRENCE_TYPE: {
        WEEKLY: 'WEEKLY',
        MONTHLY: 'MONTHLY',
        YEARLY: 'YEARLY'
    },
    
    // Valores padrão
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MAX_ATTACHMENT_SIZE_MB: 5,
    MAX_ATTACHMENT_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    MAX_DESCRIPTION_LENGTH: 255,
    MAX_AMOUNT: 999999999999.99, // ~1 trilhão
    MIN_AMOUNT: 0.01
};
