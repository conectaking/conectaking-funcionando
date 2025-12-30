-- ============================================
-- LIMPEZA: Remover módulos que não existem mais ou foram ocultados
-- Execute este script APÓS a migration 021
-- ============================================

-- Remover módulos que foram ocultados ou não existem mais
DELETE FROM module_plan_availability 
WHERE module_type IN (
    'reddit', 'twitch',                    -- Ocultados no HTML
    'pdf', 'pdf_embed',                    -- Ocultados no HTML
    'instagram_embed', 'tiktok_embed',     -- Ocultados no HTML
    'spotify_embed', 'linkedin_embed',     -- Ocultados no HTML
    'pinterest_embed',                     -- Ocultado no HTML
    'banner_carousel',                     -- Não existe (só banner e carousel separados)
    'product_catalog'                      -- Substituído por sales_page
);

-- Verificar quantos registros restaram
SELECT 
    'Módulos após limpeza' as status,
    COUNT(*) as total_registros,
    COUNT(DISTINCT module_type) as total_modulos,
    COUNT(DISTINCT plan_code) as total_planos
FROM module_plan_availability;

-- Mostrar módulos que restaram
SELECT DISTINCT module_type
FROM module_plan_availability
ORDER BY module_type;

