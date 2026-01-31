-- ===========================================
-- Migration: Incluir king_selection na constraint de item_type (profile_items)
-- Data: 2026-01-31
-- Descrição: Atualiza a CHECK constraint para aceitar o novo tipo sem quebrar os tipos existentes
-- ===========================================

-- Remover constraint existente (qualquer versão anterior)
ALTER TABLE profile_items
DROP CONSTRAINT IF EXISTS profile_items_item_type_check;

-- Recriar com lista consolidada + king_selection
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
    'finance',
    'agenda',
    'king_selection'  -- ← NOVO módulo isolado (KingSelection)
));

-- Verificação
SELECT
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profile_items_item_type_check';

