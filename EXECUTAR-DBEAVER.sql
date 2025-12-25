-- ===========================================
-- Migration: Adicionar novos tipos de embed ao ENUM item_type_enum
-- Data: 2025-12-23
-- Descrição: Adiciona suporte para tiktok_embed, spotify_embed, linkedin_embed e pinterest_embed
-- 
-- INSTRUÇÕES PARA EXECUTAR NO DBEAVER:
-- 1. Conecte-se ao banco de dados do Render no DBeaver
-- 2. Selecione o banco de dados correto
-- 3. Execute cada comando ALTER TYPE separadamente (um por vez)
--    OU selecione todos e execute de uma vez
-- ===========================================

-- IMPORTANTE: No PostgreSQL, ALTER TYPE ADD VALUE não pode ser executado dentro de uma transação
-- Execute cada comando separadamente se necessário

-- Adicionar tiktok_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'tiktok_embed';

-- Adicionar spotify_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'spotify_embed';

-- Adicionar linkedin_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'linkedin_embed';

-- Adicionar pinterest_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'pinterest_embed';

-- ===========================================
-- VERIFICAÇÃO (opcional - execute para confirmar)
-- ===========================================

-- Verificar todos os valores do ENUM
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
ORDER BY enumsortorder;

-- Você deve ver os novos valores na lista:
-- ... (valores anteriores) ...
-- tiktok_embed
-- spotify_embed
-- linkedin_embed
-- pinterest_embed

