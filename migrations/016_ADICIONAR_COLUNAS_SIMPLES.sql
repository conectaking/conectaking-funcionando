-- ===========================================
-- Migration: Adicionar colunas que faltam em profile_items (VERSÃO SIMPLES)
-- Data: 2025-12-26
-- Execute este script se o anterior não funcionou
-- ===========================================

-- Adicionar coluna recipient_name
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- Adicionar coluna pix_amount
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS pix_amount DECIMAL(10,2);

-- Adicionar coluna pix_description
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS pix_description TEXT;

-- Verificar se foram adicionadas
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name IN ('recipient_name', 'pix_amount', 'pix_description')
ORDER BY column_name;

