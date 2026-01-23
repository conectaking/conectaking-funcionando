-- ===========================================
-- Migration: Adicionar campos WhatsApp à lista de convidados
-- Data: 2026-01-08
-- Descrição: Adiciona campos whatsapp_number, enable_pastor_button e pastor_whatsapp_number
--            à tabela guest_list_items para suportar integração WhatsApp no modo lista
-- ===========================================

DO $$
BEGIN
    -- Adicionar whatsapp_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN whatsapp_number VARCHAR(50);
        RAISE NOTICE 'Coluna whatsapp_number adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna whatsapp_number já existe em guest_list_items';
    END IF;

    -- Adicionar enable_pastor_button
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'enable_pastor_button'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN enable_pastor_button BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Coluna enable_pastor_button adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna enable_pastor_button já existe em guest_list_items';
    END IF;

    -- Adicionar pastor_whatsapp_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'pastor_whatsapp_number'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN pastor_whatsapp_number VARCHAR(50);
        RAISE NOTICE 'Coluna pastor_whatsapp_number adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna pastor_whatsapp_number já existe em guest_list_items';
    END IF;

    -- Adicionar enable_whatsapp (controle geral de WhatsApp)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'enable_whatsapp'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN enable_whatsapp BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Coluna enable_whatsapp adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna enable_whatsapp já existe em guest_list_items';
    END IF;
END $$;

COMMENT ON COLUMN guest_list_items.whatsapp_number IS 'Número do WhatsApp principal para envio de mensagens';
COMMENT ON COLUMN guest_list_items.enable_whatsapp IS 'Indica se o envio via WhatsApp está habilitado (quando false, mostra apenas botão Enviar)';
COMMENT ON COLUMN guest_list_items.enable_pastor_button IS 'Indica se o botão do pastor está ativo';
COMMENT ON COLUMN guest_list_items.pastor_whatsapp_number IS 'Número do WhatsApp do pastor para contato direto';

