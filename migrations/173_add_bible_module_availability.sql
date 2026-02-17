-- ===========================================
-- Migration 173: Adicionar bible à CHECK de profile_items e module_plan_availability
-- Bíblia disponível para TODOS os planos
-- ===========================================

-- PASSO 1: Adicionar bible à constraint CHECK de profile_items.item_type
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
            'convite', 'photographer_site', 'bible'
        ));
        RAISE NOTICE 'profile_items_item_type_check atualizada com bible.';
    END IF;
END $$;

-- PASSO 2: Inserir bible em module_plan_availability para TODOS os planos
DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'premium', 'king_base', 'king_essential',
        'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal'
    ];
    plan_code_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'bible', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'bible' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

SELECT module_type, plan_code, is_available
FROM module_plan_availability
WHERE module_type = 'bible'
ORDER BY plan_code;
