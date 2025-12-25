-- ===========================================
-- Migration: Adicionar product_catalog ao ENUM item_type_enum
-- Data: 2025-12-23
-- Descrição: Adiciona suporte para catálogo de produtos
-- ===========================================

-- IMPORTANTE: No PostgreSQL, ALTER TYPE ADD VALUE não pode ser executado dentro de uma transação
-- Execute cada comando separadamente se necessário

-- Adicionar product_catalog
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'product_catalog';

-- Verificação (opcional - para confirmar)
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
ORDER BY enumsortorder;

