-- Migration 244: colunas de logo na empresa + border radius CSS + item_types do cartão
-- Corrige 500 em /api/account/status e /api/profile/save-all no VPS Hetzner.

-- 1) Logo da empresa em users (usado por account/status, cartão, documentos)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_size INTEGER DEFAULT 60;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_link TEXT;

-- 2) button_border_radius: frontend envia CSS ("12px" / "12px 12px 12px 12px"), não INTEGER
ALTER TABLE user_profiles
  ALTER COLUMN button_border_radius TYPE TEXT
  USING (
    CASE
      WHEN button_border_radius IS NULL THEN NULL
      ELSE button_border_radius::text || 'px'
    END
  );
ALTER TABLE user_profiles ALTER COLUMN button_border_radius SET DEFAULT '12px';

-- 3) CHECK de item_type desatualizada (sem bible, wifi, location, etc.)
-- Recria lista completa compatível com o código atual (VARCHAR, não enum).
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc
          ON cc.constraint_name = tc.constraint_name
         AND cc.constraint_schema = tc.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'profile_items'
          AND tc.constraint_type = 'CHECK'
          AND (
            tc.constraint_name ILIKE '%item_type%'
            OR (cc.check_clause IS NOT NULL AND cc.check_clause ILIKE '%item_type%')
          )
    LOOP
        EXECUTE 'ALTER TABLE profile_items DROP CONSTRAINT IF EXISTS ' || quote_ident(c.constraint_name);
    END LOOP;

    ALTER TABLE profile_items
      ADD CONSTRAINT profile_items_item_type_check
      CHECK (item_type::text = ANY (ARRAY[
        'link','whatsapp','telegram','email','facebook','instagram','pinterest','reddit',
        'tiktok','twitch','twitter','linkedin','portfolio','youtube','spotify',
        'banner','carousel','pdf','pdf_embed','pix','pix_qrcode',
        'instagram_embed','youtube_embed','tiktok_embed','spotify_embed','linkedin_embed','pinterest_embed',
        'product_catalog','sales_page','digital_form','guest_list','contract','king_selection',
        'bible','wifi','location','photographer_site','texto_com_botao','vitrine_header','vitrine_marquee'
      ]::text[]));
END $$;

SELECT 'Migration 244 aplicada.' AS status;
