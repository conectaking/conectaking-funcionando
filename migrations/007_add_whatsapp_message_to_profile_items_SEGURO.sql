-- Migration: Adicionar campo whatsapp_message (VERSÃO SEGURA - Execute este!)
-- Data: 2025-12-22
-- 
-- Este script executa tudo em uma transação segura
-- Pode ser executado múltiplas vezes sem problemas

DO $$
BEGIN
    -- Adicionar coluna se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profile_items' 
        AND column_name = 'whatsapp_message'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN whatsapp_message TEXT;
        
        RAISE NOTICE 'Coluna whatsapp_message criada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna whatsapp_message já existe.';
    END IF;
    
    -- Adicionar comentário (sempre executa, mesmo se a coluna já existir)
    COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
    
    RAISE NOTICE 'Comentário adicionado com sucesso!';
END $$;
