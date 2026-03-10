-- Formato de exibição no cartão: botão (padrão) ou banner (igual King Forms)
-- card_banner_image_url = imagem do banner quando display_format = 'banner'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sales_pages' AND column_name = 'display_format'
    ) THEN
        ALTER TABLE sales_pages
        ADD COLUMN display_format VARCHAR(20) DEFAULT 'button' CHECK (display_format IN ('button', 'banner'));
        COMMENT ON COLUMN sales_pages.display_format IS 'Formato no cartão: button ou banner';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sales_pages' AND column_name = 'card_banner_image_url'
    ) THEN
        ALTER TABLE sales_pages
        ADD COLUMN card_banner_image_url TEXT;
        COMMENT ON COLUMN sales_pages.card_banner_image_url IS 'URL da imagem do banner no cartão (quando display_format = banner)';
    END IF;
END $$;
