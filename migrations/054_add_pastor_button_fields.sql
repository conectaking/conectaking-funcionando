-- ===========================================
-- Migration: Adicionar campos do botão do Pastor
-- Data: 2026-01-06
-- Descrição: Adiciona enable_pastor_button e pastor_whatsapp_number para permitir botão especial de contato com o pastor
-- ===========================================

DO $$
BEGIN
    -- Adicionar enable_pastor_button (controla se o botão do pastor está ativo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'enable_pastor_button'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN enable_pastor_button BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Coluna enable_pastor_button adicionada com sucesso à digital_form_items';
    ELSE
        RAISE NOTICE 'Coluna enable_pastor_button já existe em digital_form_items';
    END IF;

    -- Adicionar pastor_whatsapp_number (número do WhatsApp do pastor)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'pastor_whatsapp_number'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN pastor_whatsapp_number VARCHAR(50);
        
        RAISE NOTICE 'Coluna pastor_whatsapp_number adicionada com sucesso à digital_form_items';
    ELSE
        RAISE NOTICE 'Coluna pastor_whatsapp_number já existe em digital_form_items';
    END IF;

END $$;

COMMENT ON COLUMN digital_form_items.enable_pastor_button IS 'Indica se o botão "Enviar Mensagem para o Pastor" está ativo no formulário';
COMMENT ON COLUMN digital_form_items.pastor_whatsapp_number IS 'Número do WhatsApp do pastor para contato direto';

