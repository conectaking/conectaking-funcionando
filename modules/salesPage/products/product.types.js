// Tipos e constantes para produtos

module.exports = {
    STATUS: {
        ACTIVE: 'ACTIVE',
        PAUSED: 'PAUSED',
        OUT_OF_STOCK: 'OUT_OF_STOCK',
        ARCHIVED: 'ARCHIVED'
    },
    
    STATUS_TRANSITIONS: {
        ACTIVE: ['PAUSED', 'OUT_OF_STOCK', 'ARCHIVED'],
        PAUSED: ['ACTIVE', 'ARCHIVED'],
        OUT_OF_STOCK: ['ACTIVE', 'ARCHIVED'],
        ARCHIVED: []
    },
    
    BADGES: {
        OFFER: 'oferta',
        FEATURED: 'destaque',
        NEW: 'novo'
    }
};

