-- ===========================================
-- Migration: Personalização da página de checkout (KingForms)
-- Data: 2026-02-03
-- Descrição: Campos para personalizar aparência da página de pagamento (logo, cor, título, rodapé)
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'form_checkout_configs' AND column_name = 'checkout_page_logo_url') THEN
    ALTER TABLE form_checkout_configs ADD COLUMN checkout_page_logo_url TEXT;
    RAISE NOTICE 'form_checkout_configs.checkout_page_logo_url adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'form_checkout_configs' AND column_name = 'checkout_page_primary_color') THEN
    ALTER TABLE form_checkout_configs ADD COLUMN checkout_page_primary_color VARCHAR(20) DEFAULT '#22c55e';
    RAISE NOTICE 'form_checkout_configs.checkout_page_primary_color adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'form_checkout_configs' AND column_name = 'checkout_page_title') THEN
    ALTER TABLE form_checkout_configs ADD COLUMN checkout_page_title VARCHAR(200);
    RAISE NOTICE 'form_checkout_configs.checkout_page_title adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'form_checkout_configs' AND column_name = 'checkout_page_footer') THEN
    ALTER TABLE form_checkout_configs ADD COLUMN checkout_page_footer VARCHAR(500);
    RAISE NOTICE 'form_checkout_configs.checkout_page_footer adicionado.';
  END IF;
END $$;

COMMENT ON COLUMN form_checkout_configs.checkout_page_logo_url IS 'URL da logo exibida na página de checkout (opcional)';
COMMENT ON COLUMN form_checkout_configs.checkout_page_primary_color IS 'Cor primária da página de checkout (hex, ex: #22c55e)';
COMMENT ON COLUMN form_checkout_configs.checkout_page_title IS 'Título/nome exibido no topo da página de checkout (ex: Nome do evento)';
COMMENT ON COLUMN form_checkout_configs.checkout_page_footer IS 'Texto do rodapé da página de checkout (ex: KingForms by ConectaKing)';
