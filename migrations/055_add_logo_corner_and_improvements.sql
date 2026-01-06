-- ===========================================
-- Migration: Adicionar campos de melhorias e logomarca no cantinho
-- Data: 2026-01-06
-- Descrição: Adiciona show_logo_corner e outros campos de melhorias
-- ===========================================

DO $$
BEGIN
    -- Adicionar show_logo_corner (controla se o logo aparece no cantinho)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'show_logo_corner'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN show_logo_corner BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Coluna show_logo_corner adicionada com sucesso à digital_form_items';
    ELSE
        RAISE NOTICE 'Coluna show_logo_corner já existe em digital_form_items';
    END IF;

END $$;

COMMENT ON COLUMN digital_form_items.show_logo_corner IS 'Indica se o logo deve aparecer fixo no cantinho superior direito do formulário público';

