-- Migration: Adicionar campo whatsapp_message para armazenar mensagem personalizada do WhatsApp
-- Data: 2025-12-22

-- IMPORTANTE: Execute os comandos UM POR VEZ no DBeaver, não todos juntos!

-- PASSO 1: Adicionar coluna whatsapp_message na tabela profile_items
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;

-- PASSO 2: Depois que o PASSO 1 for executado com sucesso, execute este comando:
-- COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
