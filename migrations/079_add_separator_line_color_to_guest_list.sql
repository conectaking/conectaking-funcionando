-- Migration 079: Adicionar coluna separator_line_color para personalizar cor da linha separadora em guest_list_items
-- Data: 2026-01-13

DO $$ 
BEGIN
    -- Adicionar coluna separator_line_color na tabela guest_list_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'separator_line_color'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN separator_line_color VARCHAR(7) DEFAULT NULL;
        
        COMMENT ON COLUMN guest_list_items.separator_line_color IS 'Cor personalizada para a linha separadora abaixo do título "Preencha os dados" (ex: #e8eaed). Se NULL, usa cor padrão cinza claro.';
        
        RAISE NOTICE 'Coluna separator_line_color adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna separator_line_color já existe na guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 079 concluída com sucesso! Coluna separator_line_color adicionada à guest_list_items.' AS status;
