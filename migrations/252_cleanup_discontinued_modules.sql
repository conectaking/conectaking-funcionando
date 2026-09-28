-- Migration 252: Remoção definitiva de módulos descontinuados e garantia de tabelas individuais
-- Data: 2026-09-28
-- Descrição: Remove módulos descontinuados (agenda, contract, kingbrief, king_bolao, photographer_site)
--            e assegura a integridade das tabelas de planos individuais.

-- 1. Remoção de módulos descontinuados da disponibilidade por plano
DELETE FROM module_plan_availability 
WHERE module_type IN ('agenda', 'contract', 'kingbrief', 'king_bolao', 'photographer_site');

-- 2. Remoção de módulos descontinuados dos planos individuais e exclusões de usuários
DELETE FROM individual_user_plans 
WHERE module_type IN ('agenda', 'contract', 'kingbrief', 'king_bolao', 'photographer_site');

DELETE FROM individual_user_plan_exclusions 
WHERE module_type IN ('agenda', 'contract', 'kingbrief', 'king_bolao', 'photographer_site');

-- 3. Garantir criação das tabelas necessárias caso não existam
CREATE TABLE IF NOT EXISTS individual_user_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_type)
);

CREATE TABLE IF NOT EXISTS individual_user_plan_exclusions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_type)
);

CREATE TABLE IF NOT EXISTS individual_user_finance_profiles (
    user_id VARCHAR(255) NOT NULL PRIMARY KEY,
    max_finance_profiles INTEGER NOT NULL DEFAULT 1 CHECK (max_finance_profiles >= 1 AND max_finance_profiles <= 20),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_individual_user_plans_user_id ON individual_user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_user_plan_exclusions_user_id ON individual_user_plan_exclusions(user_id);

SELECT 'Migration 252: Módulos descontinuados removidos e tabelas de planos individuais garantidas.' AS status;
