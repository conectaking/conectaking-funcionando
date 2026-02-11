-- Adiciona photographer_site à constraint CHECK de profile_items.item_type (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'profile_items' AND constraint_name = 'profile_items_item_type_check'
    ) THEN
        ALTER TABLE profile_items DROP CONSTRAINT profile_items_item_type_check;
        ALTER TABLE profile_items ADD CONSTRAINT profile_items_item_type_check
        CHECK (item_type IN (
            'link', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram', 'pinterest', 'reddit',
            'tiktok', 'twitch', 'twitter', 'linkedin', 'portfolio', 'youtube', 'spotify', 'banner',
            'carousel', 'pdf', 'pdf_embed', 'pix', 'pix_qrcode', 'instagram_embed', 'youtube_embed',
            'tiktok_embed', 'spotify_embed', 'linkedin_embed', 'pinterest_embed', 'product_catalog',
            'sales_page', 'digital_form', 'guest_list', 'contract', 'king_selection', 'agenda',
            'convite', 'photographer_site'
        ));
        RAISE NOTICE 'profile_items_item_type_check atualizada com photographer_site.';
    END IF;
END $$;

SELECT 'Migration 168: photographer_site na CHECK de profile_items.' AS status;
