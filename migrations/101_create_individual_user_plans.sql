-- Migration: Criar tabela para planos individuais por usuário
-- Data: 2026-01-19
-- Descrição: Permite adicionar módulos específicos para usuários individuais, independente do plano

CREATE TABLE IF NOT EXISTS individual_user_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_type VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) REFERENCES subscription_plans(plan_code) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_type)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_individual_user_plans_user_id ON individual_user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_user_plans_module_type ON individual_user_plans(module_type);

-- Comentários
COMMENT ON TABLE individual_user_plans IS 'Armazena módulos específicos concedidos a usuários individuais, independente do plano';
COMMENT ON COLUMN individual_user_plans.user_id IS 'ID do usuário que recebe o módulo';
COMMENT ON COLUMN individual_user_plans.module_type IS 'Tipo de módulo concedido (ex: carousel, finance, agenda)';
COMMENT ON COLUMN individual_user_plans.plan_code IS 'Plano base do usuário (opcional, para referência)';
