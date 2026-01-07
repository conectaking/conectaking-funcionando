-- ===========================================
-- Migration: Adicionar secondary_color e pastor_button_name
-- Data: 2026-01-07
-- Descrição: Adiciona suporte para cor secundária e nome personalizado do botão do pastor
-- ===========================================

-- Adicionar coluna secondary_color
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'secondary_color'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN secondary_color VARCHAR(7) DEFAULT NULL;
        
        COMMENT ON COLUMN digital_form_items.secondary_color IS 'Cor secundária para gradientes (usada quando a cor primária é muito escura)';
        
        RAISE NOTICE 'Coluna secondary_color adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna secondary_color já existe.';
    END IF;
END $$;

-- Adicionar coluna pastor_button_name
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'pastor_button_name'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN pastor_button_name VARCHAR(255) DEFAULT 'Enviar Mensagem para o Pastor';
        
        COMMENT ON COLUMN digital_form_items.pastor_button_name IS 'Nome personalizado do botão do pastor';
        
        RAISE NOTICE 'Coluna pastor_button_name adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna pastor_button_name já existe.';
    END IF;
END $$;

-- Adicionar coluna card_color
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'card_color'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN card_color VARCHAR(7) DEFAULT '#FFFFFF';
        
        COMMENT ON COLUMN digital_form_items.card_color IS 'Cor do fundo dos cards/containers brancos do formulário';
        
        RAISE NOTICE 'Coluna card_color adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna card_color já existe.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 059 concluída com sucesso! Colunas secondary_color, pastor_button_name e card_color adicionadas.' AS status;

