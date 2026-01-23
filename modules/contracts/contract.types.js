// Tipos e constantes para o módulo de Contratos

module.exports = {
    STATUS: {
        DRAFT: 'draft',
        SENT: 'sent',
        SIGNED: 'signed',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    
    CONTRACT_TYPE: {
        TEMPLATE: 'template',
        IMPORTED: 'imported'
    },
    
    SIGNATURE_TYPE: {
        CANVAS: 'canvas',
        UPLOAD: 'upload',
        TYPED: 'typed'
    },
    
    SIGNER_ROLE: {
        SIGNER: 'signer',
        WITNESS: 'witness',
        OWNER: 'owner'
    },
    
    AUDIT_ACTIONS: {
        CREATED: 'created',
        EDITED: 'edited',
        SENT: 'sent',
        VIEWED: 'viewed',
        SIGNED: 'signed',
        FINALIZED: 'finalized',
        DOWNLOADED: 'downloaded',
        DELETED: 'deleted',
        CANCELLED: 'cancelled',
        DUPLICATED: 'duplicated'
    },
    
    STATUS_TRANSITIONS: {
        draft: ['sent', 'cancelled'],
        sent: ['signed', 'completed', 'cancelled'],
        signed: ['completed', 'cancelled'],
        completed: [], // Não pode transicionar de completed
        cancelled: [] // Não pode transicionar de cancelled
    },
    
    // Categorias de templates
    TEMPLATE_CATEGORIES: [
        'Prestação de Serviços',
        'Marketing',
        'Fotografia',
        'Filmmaker',
        'Design',
        'Eventos',
        'Consultoria',
        'Tráfego Pago',
        'NDA',
        'Parceria Comercial',
        'Locação de Equipamento',
        'Outros'
    ],
    
    // Valores padrão
    DEFAULT_TOKEN_EXPIRY_DAYS: 7,
    MAX_PDF_SIZE_MB: 10,
    MAX_PDF_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_SIGNATURE_IMAGE_SIZE_MB: 2,
    MAX_SIGNATURE_IMAGE_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
    MAX_SIGNATURE_IMAGE_DIMENSIONS: { width: 2000, height: 1000 },
    MIN_SIGNATURE_CANVAS_SIZE: { width: 50, height: 20 }
};
