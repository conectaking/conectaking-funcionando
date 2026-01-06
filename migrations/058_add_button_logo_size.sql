-- Migration: Adicionar coluna button_logo_size à tabela digital_form_items
-- Data: 2024-12

-- Adicionar coluna button_logo_size se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'button_logo_size'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN button_logo_size INTEGER DEFAULT 40;
        
        RAISE NOTICE 'Coluna button_logo_size adicionada com sucesso à digital_form_items';
    ELSE
        RAISE NOTICE 'Coluna button_logo_size já existe em digital_form_items';
    END IF;

END $$;

COMMENT ON COLUMN digital_form_items.button_logo_size IS 'Tamanho em pixels do logo do botão no modo botão do formulário (padrão: 40px)';

