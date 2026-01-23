-- Migration 078: Adicionar coluna separator_line_color para personalizar cor da linha separadora
-- Data: 2026-01-13

DO $$ 
BEGIN
    -- Adicionar coluna separator_line_color na tabela digital_form_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'separator_line_color'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN separator_line_color VARCHAR(7) DEFAULT NULL;
        
        COMMENT ON COLUMN digital_form_items.separator_line_color IS 'Cor personalizada para a linha separadora abaixo do título "Preencha os dados" (ex: #e8eaed). Se NULL, usa cor padrão cinza claro.';
        
        RAISE NOTICE 'Coluna separator_line_color adicionada com sucesso à digital_form_items!';
    ELSE
        RAISE NOTICE 'Coluna separator_line_color já existe na digital_form_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 078 concluída com sucesso! Coluna separator_line_color adicionada à digital_form_items.' AS status;
