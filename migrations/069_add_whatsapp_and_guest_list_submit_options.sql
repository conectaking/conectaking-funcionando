-- ===========================================
-- Migration: Adicionar opções de envio para WhatsApp e Lista de Convidados
-- Data: 2026-01-10
-- Descrição: Adiciona campos para controlar se o formulário envia para WhatsApp e/ou para lista de convidados
-- ===========================================

-- Adicionar coluna enable_whatsapp
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'enable_whatsapp'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN enable_whatsapp BOOLEAN DEFAULT true;
        
        COMMENT ON COLUMN digital_form_items.enable_whatsapp IS 'Se true, permite envio do formulário via WhatsApp';
        
        RAISE NOTICE 'Coluna enable_whatsapp adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna enable_whatsapp já existe.';
    END IF;
END $$;

-- Adicionar coluna enable_guest_list_submit
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'enable_guest_list_submit'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN enable_guest_list_submit BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN digital_form_items.enable_guest_list_submit IS 'Se true, salva o formulário na lista de convidados quando item_type é guest_list';
        
        RAISE NOTICE 'Coluna enable_guest_list_submit adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna enable_guest_list_submit já existe.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 069 concluída com sucesso! Colunas enable_whatsapp e enable_guest_list_submit adicionadas.' AS status;
