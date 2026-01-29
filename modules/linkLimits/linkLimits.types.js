// Tipos e constantes para o módulo de Link Limits

module.exports = {
    // Tipos de módulos que podem ter limites
    MODULE_TYPES: [
        'banner',
        'whatsapp',
        'instagram',
        'telegram',
        'email',
        'facebook',
        'youtube',
        'tiktok',
        'twitter',
        'spotify',
        'linkedin',
        'pinterest',
        'link',
        'portfolio',
        'carousel',
        'youtube_embed',
        'instagram_embed',
        'sales_page',
        'digital_form',
        'pix',
        'pix_qrcode'
    ],
    
    // Valores padrão
    DEFAULT_MAX_LINKS: null, // null = ilimitado
    MAX_RECOMMENDED_LINKS: 10000, // Máximo recomendado para validação
    
    // Cache TTL (em segundos)
    CACHE_TTL: 300, // 5 minutos
    
    // Prefixos de cache
    CACHE_PREFIX: {
        USER_LIMITS: 'link_limit:user:',
        PLAN_LIMITS: 'link_limit:plan:',
        MODULE_PLAN_LIMIT: 'link_limit:plan_module:'
    }
};
