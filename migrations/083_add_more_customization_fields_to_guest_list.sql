-- ===========================================
-- Migration: Adicionar mais campos de personalização
-- Data: 2026-01-15
-- Descrição: Adiciona campos para personalizar cores de botões, números, confirmação rápida
-- ===========================================

DO $$ 
BEGIN
    -- qr_code_button_color: Cor primária do botão QR Code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'qr_code_button_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN qr_code_button_color VARCHAR(7) DEFAULT '#FFC700';
        RAISE NOTICE 'Coluna qr_code_button_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna qr_code_button_color já existe em guest_list_items';
    END IF;
    
    -- qr_code_button_color_secondary: Cor secundária do botão QR Code (para degradê)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'qr_code_button_color_secondary'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN qr_code_button_color_secondary VARCHAR(7) DEFAULT '#FFB700';
        RAISE NOTICE 'Coluna qr_code_button_color_secondary adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna qr_code_button_color_secondary já existe em guest_list_items';
    END IF;
    
    -- qr_code_button_text_color: Cor do texto do botão QR Code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'qr_code_button_text_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN qr_code_button_text_color VARCHAR(7) DEFAULT '#000000';
        RAISE NOTICE 'Coluna qr_code_button_text_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna qr_code_button_text_color já existe em guest_list_items';
    END IF;
    
    -- search_button_color_secondary: Cor secundária do botão de busca (para degradê)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'search_button_color_secondary'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN search_button_color_secondary VARCHAR(7) DEFAULT '#20BA5A';
        RAISE NOTICE 'Coluna search_button_color_secondary adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna search_button_color_secondary já existe em guest_list_items';
    END IF;
    
    -- quick_confirm_title_color: Cor do texto "Confirmação Rápida"
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'quick_confirm_title_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN quick_confirm_title_color VARCHAR(7) DEFAULT '#FFFFFF';
        RAISE NOTICE 'Coluna quick_confirm_title_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna quick_confirm_title_color já existe em guest_list_items';
    END IF;
    
    -- quick_confirm_icon_color: Cor do ícone "Confirmação Rápida" (raio)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'quick_confirm_icon_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN quick_confirm_icon_color VARCHAR(7) DEFAULT '#FFC700';
        RAISE NOTICE 'Coluna quick_confirm_icon_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna quick_confirm_icon_color já existe em guest_list_items';
    END IF;
    
    -- stats_number_color: Cor dos números dos cards (19, 1, 18)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'stats_number_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN stats_number_color VARCHAR(7) DEFAULT '#FFC700';
        RAISE NOTICE 'Coluna stats_number_color adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna stats_number_color já existe em guest_list_items';
    END IF;

END $$;

COMMENT ON COLUMN guest_list_items.qr_code_button_color IS 'Cor primária do botão QR Code';
COMMENT ON COLUMN guest_list_items.qr_code_button_color_secondary IS 'Cor secundária do botão QR Code (para degradê)';
COMMENT ON COLUMN guest_list_items.qr_code_button_text_color IS 'Cor do texto do botão QR Code';
COMMENT ON COLUMN guest_list_items.search_button_color_secondary IS 'Cor secundária do botão de busca (para degradê)';
COMMENT ON COLUMN guest_list_items.quick_confirm_title_color IS 'Cor do texto Confirmação Rápida';
COMMENT ON COLUMN guest_list_items.quick_confirm_icon_color IS 'Cor do ícone Confirmação Rápida (raio)';
COMMENT ON COLUMN guest_list_items.stats_number_color IS 'Cor dos números dos cards de estatísticas';
