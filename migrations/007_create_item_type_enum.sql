-- ===========================================
-- Migration: Criar ENUM item_type_enum (usado por 008, 017, 046, 061, 172, etc.)
-- Sem esta migration, em base nova o tipo não existe e as migrations que fazem
-- ALTER TYPE item_type_enum ADD VALUE falham → tabelas digital_form_items, guest_list_items, bible_items nunca são criadas.
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type_enum') THEN
        CREATE TYPE item_type_enum AS ENUM (
            'link', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram',
            'pinterest', 'reddit', 'tiktok', 'twitch', 'twitter', 'linkedin',
            'portfolio', 'youtube', 'spotify', 'banner', 'carousel', 'pdf', 'pdf_embed',
            'pix', 'pix_qrcode', 'instagram_embed', 'youtube_embed',
            'tiktok_embed', 'spotify_embed', 'linkedin_embed', 'pinterest_embed',
            'product_catalog', 'sales_page', 'digital_form', 'guest_list', 'contract',
            'king_selection', 'agenda', 'photographer_site', 'bible'
        );
        RAISE NOTICE 'item_type_enum criado.';
    ELSE
        RAISE NOTICE 'item_type_enum já existe.';
    END IF;
END $$;

SELECT 'Migration 007: item_type_enum garantido.' AS status;
