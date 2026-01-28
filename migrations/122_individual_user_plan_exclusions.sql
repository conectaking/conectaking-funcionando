-- Migration: Permitir "tirar do plano" em Planos Individuais
-- Data: 2026-01-28
-- Descrição: Tabela para módulos que estão no plano base mas foram removidos para um usuário específico (personalização).

CREATE TABLE IF NOT EXISTS individual_user_plan_exclusions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_type)
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'individual_user_plan_exclusions_user_id_fkey')
    THEN
        ALTER TABLE individual_user_plan_exclusions
        ADD CONSTRAINT individual_user_plan_exclusions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'FK individual_user_plan_exclusions_user_id_fkey criada';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_individual_user_plan_exclusions_user_id ON individual_user_plan_exclusions(user_id);

COMMENT ON TABLE individual_user_plan_exclusions IS 'Módulos do plano base que o admin removeu para este usuário (tirar do plano).';
