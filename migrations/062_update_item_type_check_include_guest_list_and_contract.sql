-- ===========================================
-- Migration: Atualizar constraint CHECK para incluir guest_list e contract
-- Data: 2026-01-07
-- Descrição: Adiciona 'guest_list' e 'contract' à constraint CHECK de item_type
-- ===========================================

-- ===========================================
-- PARTE 1: Remover a constraint antiga
-- ===========================================
ALTER TABLE profile_items 
DROP CONSTRAINT IF EXISTS profile_items_item_type_check;

-- ===========================================
-- PARTE 2: Criar nova constraint com TODOS os tipos (incluindo guest_list e contract)
-- ===========================================
-- Inclui também king_selection e agenda para não violar linhas já existentes
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
    'sales_page',
    'digital_form',
    'guest_list',
    'contract',
    'king_selection',
    'agenda'
));

-- Verificação
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'profile_items_item_type_check';

