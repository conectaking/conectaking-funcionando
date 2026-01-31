-- ===========================================
-- Migration: Incluir king_selection na constraint de item_type (profile_items)
-- Data: 2026-01-31
-- Descrição: Atualiza a CHECK constraint para aceitar o novo tipo sem quebrar os tipos existentes
-- ===========================================

-- ATENÇÃO:
-- Alguns bancos usam ENUM em profile_items.item_type (ex.: item_type_enum).
-- Nesse caso, recriar CHECK com valores que não existem no ENUM causa erro
-- (ex.: "invalid input value for enum ...").
-- Para bancos com ENUM, esta migration vira NO-OP e o novo valor é adicionado via migration 143_*_item_type_enum.sql.

DO $$
DECLARE
    col RECORD;
BEGIN
    SELECT data_type, udt_name
    INTO col
    FROM information_schema.columns
    WHERE table_name = 'profile_items' AND column_name = 'item_type';

    -- Se for ENUM/USER-DEFINED, não mexer na CHECK.
    IF col.data_type = 'USER-DEFINED' THEN
        RAISE NOTICE 'profile_items.item_type é USER-DEFINED (%). Pulando atualização da CHECK (usar migration do ENUM).', col.udt_name;
        RETURN;
    END IF;

    -- Caso NÃO seja enum, recriar a CHECK com lista consolidada + king_selection.
    ALTER TABLE profile_items
    DROP CONSTRAINT IF EXISTS profile_items_item_type_check;

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
        'king_selection'
    ));
END$$;


