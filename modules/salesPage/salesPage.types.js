// Tipos e constantes para o módulo de Sales Page

module.exports = {
    STATUS: {
        DRAFT: 'DRAFT',
        PUBLISHED: 'PUBLISHED',
        PAUSED: 'PAUSED',
        ARCHIVED: 'ARCHIVED'
    },
    
    PRODUCT_STATUS: {
        ACTIVE: 'ACTIVE',
        PAUSED: 'PAUSED',
        OUT_OF_STOCK: 'OUT_OF_STOCK',
        ARCHIVED: 'ARCHIVED'
    },
    
    EVENT_TYPES: {
        PAGE_VIEW: 'page_view',
        PRODUCT_VIEW: 'product_view',
        PRODUCT_CLICK: 'product_click',
        ADD_TO_CART: 'add_to_cart',
        CHECKOUT_CLICK: 'checkout_click'
    },
    
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },
    
    MAX_PRODUCTS_PER_PAGE: 50,
    
    STATUS_TRANSITIONS: {
        DRAFT: ['PUBLISHED', 'ARCHIVED'],
        PUBLISHED: ['PAUSED', 'DRAFT', 'ARCHIVED'], // Permite voltar para DRAFT
        PAUSED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'], // Permite voltar para DRAFT
        ARCHIVED: ['DRAFT'] // Permite desarquivar voltando para DRAFT
    },
    
    PRODUCT_STATUS_TRANSITIONS: {
        ACTIVE: ['PAUSED', 'OUT_OF_STOCK', 'ARCHIVED'],
        PAUSED: ['ACTIVE', 'ARCHIVED'],
        OUT_OF_STOCK: ['ACTIVE', 'ARCHIVED'],
        ARCHIVED: [] // Não pode transicionar de ARCHIVED
    }
};

