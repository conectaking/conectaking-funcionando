-- Migration: Adicionar coluna background_color à tabela digital_form_items
-- Data: 2024-12

-- Adicionar coluna background_color se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'background_color'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN background_color VARCHAR(7) DEFAULT '#FFFFFF';
        
        COMMENT ON COLUMN digital_form_items.background_color IS 'Cor hexadecimal de fundo do formulário (usada quando não há imagem de fundo)';
    END IF;
END $$;

