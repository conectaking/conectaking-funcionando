-- ===========================================
-- Migration 192: Adicionar fala_deus_comigo à CHECK de profile_items e module_plan_availability
-- Fala Deus Comigo disponível para TODOS os planos
-- ===========================================

-- PASSO 1: Adicionar fala_deus_comigo à constraint CHECK de profile_items.item_type
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
            'convite', 'photographer_site', 'bible', 'fala_deus_comigo'
        ));
        RAISE NOTICE 'profile_items_item_type_check atualizada com fala_deus_comigo.';
    END IF;
END $$;

-- PASSO 2: Inserir fala_deus_comigo em module_plan_availability para TODOS os planos
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
        SELECT 'fala_deus_comigo', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'fala_deus_comigo' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

-- Inserir para planos ativos que eventualmente não estejam na lista fixa
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'fala_deus_comigo', sp.plan_code, true
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = 'fala_deus_comigo' AND mpa.plan_code = sp.plan_code
  );

SELECT module_type, plan_code, is_available
FROM module_plan_availability
WHERE module_type = 'fala_deus_comigo'
ORDER BY plan_code;
