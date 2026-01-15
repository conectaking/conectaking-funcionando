-- ===========================================
-- Migration: Adicionar campos de personalização de textos e cores específicas
-- Data: 2026-01-15
-- Descrição: Adiciona campos para personalizar textos e cores de elementos específicos da portaria
-- ===========================================

DO $$ 
BEGIN
    -- event_title_custom: Título personalizado (substitui event_title na visualização)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'event_title_custom'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN event_title_custom VARCHAR(255);
        RAISE NOTICE 'Coluna event_title_custom adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna event_title_custom já existe em guest_list_items';
    END IF;
    
    -- title_text_color: Cor do texto do título
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'title_text_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN title_text_color VARCHAR(7);
        RAISE NOTICE 'Coluna title_text_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna title_text_color já existe em guest_list_items';
    END IF;
    
    -- qr_code_button_text: Texto do botão QR Code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'qr_code_button_text'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN qr_code_button_text VARCHAR(100) DEFAULT 'Ler QR Code';
        RAISE NOTICE 'Coluna qr_code_button_text adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna qr_code_button_text já existe em guest_list_items';
    END IF;
    
    -- search_button_color: Cor do botão de busca
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'search_button_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN search_button_color VARCHAR(7) DEFAULT '#25D366';
        RAISE NOTICE 'Coluna search_button_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna search_button_color já existe em guest_list_items';
    END IF;
    
    -- search_button_text_color: Cor do texto do botão de busca
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'search_button_text_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN search_button_text_color VARCHAR(7) DEFAULT '#FFFFFF';
        RAISE NOTICE 'Coluna search_button_text_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna search_button_text_color já existe em guest_list_items';
    END IF;
    
    -- search_input_text_color: Cor do texto do input de busca
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'search_input_text_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN search_input_text_color VARCHAR(7) DEFAULT '#666666';
        RAISE NOTICE 'Coluna search_input_text_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna search_input_text_color já existe em guest_list_items';
    END IF;

END $$;

COMMENT ON COLUMN guest_list_items.event_title_custom IS 'Título personalizado para exibição na portaria';
COMMENT ON COLUMN guest_list_items.title_text_color IS 'Cor do texto do título';
COMMENT ON COLUMN guest_list_items.qr_code_button_text IS 'Texto personalizado do botão QR Code';
COMMENT ON COLUMN guest_list_items.search_button_color IS 'Cor de fundo do botão de busca';
COMMENT ON COLUMN guest_list_items.search_button_text_color IS 'Cor do texto do botão de busca';
COMMENT ON COLUMN guest_list_items.search_input_text_color IS 'Cor do texto do campo de busca';
