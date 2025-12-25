-- Migration: Adicionar campo whatsapp_message (VERSÃO PARA EXECUTAR SEPARADAMENTE)
-- Data: 2025-12-22
-- 
-- INSTRUÇÕES:
-- 1. Execute PRIMEIRO o comando ALTER TABLE abaixo
-- 2. Verifique se foi executado com sucesso
-- 3. Depois execute o comando COMMENT ON COLUMN

-- ============================================
-- PASSO 1: Adicionar a coluna
-- ============================================
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;

-- ============================================
-- PASSO 2: Adicionar comentário (execute APÓS o PASSO 1)
-- ============================================
COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
