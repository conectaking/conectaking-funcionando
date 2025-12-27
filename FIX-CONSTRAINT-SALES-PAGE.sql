-- ===========================================
-- FIX: Atualizar constraint CHECK para incluir sales_page
-- Execute este script no DBeaver ou Render Shell
-- IMPORTANTE: Execute PRIMEIRO a parte 1, depois a parte 2
-- ===========================================

-- ===========================================
-- PARTE 1: Remover a constraint antiga
-- ===========================================
-- Execute APENAS esta parte primeiro (Ctrl+Enter)
ALTER TABLE profile_items 
DROP CONSTRAINT IF EXISTS profile_items_item_type_check;

-- ===========================================
-- PARTE 2: Criar nova constraint com TODOS os tipos (incluindo sales_page)
-- ===========================================
-- Execute esta parte DEPOIS de executar a PARTE 1
ALTER TABLE profile_items 
ADD CONSTRAINT profile_items_item_type_check 
CHECK (item_type IN (
    'link',
    'whatsapp',
    'telegram',
    'email',
    'facebook',
    'instagram',
    'pinterest',
    'reddit',
    'tiktok',
    'twitch',
    'twitter',
    'linkedin',
    'portfolio',
    'youtube',
    'spotify',
    'banner',
    'carousel',
    'pdf',
    'pdf_embed',
    'pix',
    'pix_qrcode',
    'instagram_embed',
    'youtube_embed',
    'tiktok_embed',
    'spotify_embed',
    'linkedin_embed',
    'pinterest_embed',
    'product_catalog',
    'sales_page'  -- ← NOVO: Página de Vendas
));

