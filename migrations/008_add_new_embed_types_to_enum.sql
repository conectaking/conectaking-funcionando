-- ===========================================
-- Migration: Adicionar novos tipos de embed ao ENUM item_type_enum
-- Data: 2025-12-23
-- Descrição: Adiciona suporte para tiktok_embed, spotify_embed, linkedin_embed e pinterest_embed
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

-- Verificar os valores do ENUM (opcional - para confirmar)
-- SELECT enum_range(NULL::item_type_enum);

