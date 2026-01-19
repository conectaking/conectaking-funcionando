// Tipos e constantes para o módulo Agenda

module.exports = {
    SLOT_TYPE: {
        RECURRING: 'RECURRING',
        ONE_OFF: 'ONE_OFF'
    },
    
    APPOINTMENT_STATUS: {
        PENDING: 'PENDING',
        CONFIRMED: 'CONFIRMED',
        CANCELLED: 'CANCELLED',
        EXPIRED: 'EXPIRED',
        NEEDS_REPAIR: 'NEEDS_REPAIR'
    },
    
    MEETING_TYPE: {
        ONLINE: 'ONLINE',
        PRESENCIAL: 'PRESENCIAL',
        HIBRIDO: 'HIBRIDO'
    },
    
    // Valores padrão
    DEFAULT_MEETING_DURATION_MINUTES: 30,
    DEFAULT_BUFFER_MINUTES: 0,
    DEFAULT_SCHEDULING_WINDOW_DAYS: 30,
    DEFAULT_TIMEZONE: 'America/Sao_Paulo',
    PENDING_EXPIRATION_MINUTES: 5
};
