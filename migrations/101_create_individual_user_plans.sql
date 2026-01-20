-- Migration: Criar tabela para planos individuais por usuário
-- Data: 2026-01-19
-- Descrição: Permite adicionar módulos específicos para usuários individuais, independente do plano

-- Criar tabela primeiro sem foreign key
CREATE TABLE IF NOT EXISTS individual_user_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Tipo correto: VARCHAR para corresponder à tabela users
    module_type VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_type)
);

-- Adicionar foreign key se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'individual_user_plans_user_id_fkey'
    ) THEN
        ALTER TABLE individual_user_plans 
        ADD CONSTRAINT individual_user_plans_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key individual_user_plans_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

-- Adicionar foreign key para subscription_plans se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'subscription_plans'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'individual_user_plans_plan_code_fkey'
    ) THEN
        ALTER TABLE individual_user_plans 
        ADD CONSTRAINT individual_user_plans_plan_code_fkey 
        FOREIGN KEY (plan_code) REFERENCES subscription_plans(plan_code) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key individual_user_plans_plan_code_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key plan_code não criada (tabela subscription_plans não existe ou constraint já existe)';
    END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_individual_user_plans_user_id ON individual_user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_user_plans_module_type ON individual_user_plans(module_type);

-- Comentários
COMMENT ON TABLE individual_user_plans IS 'Armazena módulos específicos concedidos a usuários individuais, independente do plano';
COMMENT ON COLUMN individual_user_plans.user_id IS 'ID do usuário que recebe o módulo';
COMMENT ON COLUMN individual_user_plans.module_type IS 'Tipo de módulo concedido (ex: carousel, finance, agenda)';
COMMENT ON COLUMN individual_user_plans.plan_code IS 'Plano base do usuário (opcional, para referência)';
