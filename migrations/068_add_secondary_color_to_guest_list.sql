-- ===========================================
-- Migration: Adicionar secondary_color à tabela guest_list_items
-- Data: 2026-01-10
-- Descrição: Adiciona suporte para cor secundária na lista de convidados (similar ao digital_form_items)
-- ===========================================

-- Adicionar coluna secondary_color
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'secondary_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN secondary_color VARCHAR(7) DEFAULT NULL;
        
        COMMENT ON COLUMN guest_list_items.secondary_color IS 'Cor secundária para gradientes (usada quando a cor primária é muito escura)';
        
        RAISE NOTICE 'Coluna secondary_color adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna secondary_color já existe na guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 068 concluída com sucesso! Coluna secondary_color adicionada à guest_list_items.' AS status;

