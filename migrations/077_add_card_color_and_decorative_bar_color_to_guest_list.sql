-- ===========================================
-- Migration: Adicionar card_color e decorative_bar_color à tabela guest_list_items
-- Data: 2026-01-13
-- Descrição: Adiciona suporte para cor do card e cor das barras decorativas na lista de convidados
-- ===========================================

-- Adicionar coluna card_color
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'card_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN card_color VARCHAR(7) DEFAULT '#FFFFFF';
        
        COMMENT ON COLUMN guest_list_items.card_color IS 'Cor do fundo dos cards/containers do formulário (padrão: branco)';
        
        RAISE NOTICE 'Coluna card_color adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna card_color já existe na guest_list_items.';
    END IF;
END $$;

-- Adicionar coluna decorative_bar_color
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'decorative_bar_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN decorative_bar_color VARCHAR(7) DEFAULT NULL;
        
        COMMENT ON COLUMN guest_list_items.decorative_bar_color IS 'Cor personalizada para as barras decorativas do formulário (ex: #FFC700). Se NULL, usa primary_color.';
        
        RAISE NOTICE 'Coluna decorative_bar_color adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna decorative_bar_color já existe na guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 077 concluída com sucesso! Colunas card_color e decorative_bar_color adicionadas à guest_list_items.' AS status;
