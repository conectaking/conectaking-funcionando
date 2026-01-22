-- Migration: Adicionar campo expires_at na tabela registration_codes
-- Data: 2026-01-21
-- Descrição: Adiciona campo de data de vencimento para códigos de registro e funcionalidade de exclusão automática

-- Adicionar coluna expires_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registration_codes' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE registration_codes ADD COLUMN expires_at TIMESTAMP NULL;
        COMMENT ON COLUMN registration_codes.expires_at IS 'Data de expiração do código. NULL = sem expiração';
        RAISE NOTICE 'Coluna expires_at adicionada à registration_codes com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna expires_at já existe na registration_codes.';
    END IF;
END $$;

-- Criar índice para otimizar buscas por códigos vencidos
CREATE INDEX IF NOT EXISTS idx_registration_codes_expires_at 
ON registration_codes(expires_at) 
WHERE expires_at IS NOT NULL;

-- Criar tabela para configuração de exclusão automática de códigos
CREATE TABLE IF NOT EXISTS code_auto_delete_config (
    id SERIAL PRIMARY KEY,
    days_after_expiration INTEGER NOT NULL CHECK (days_after_expiration > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(days_after_expiration)
);

COMMENT ON TABLE code_auto_delete_config IS 'Configuração para exclusão automática de códigos vencidos';
COMMENT ON COLUMN code_auto_delete_config.days_after_expiration IS 'Número de dias após expiração para excluir automaticamente';
COMMENT ON COLUMN code_auto_delete_config.is_active IS 'Se a exclusão automática está ativa';

-- Criar tabela para configuração de exclusão automática de usuários
CREATE TABLE IF NOT EXISTS user_auto_delete_config (
    id SERIAL PRIMARY KEY,
    days_after_expiration INTEGER NOT NULL CHECK (days_after_expiration > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(days_after_expiration)
);

COMMENT ON TABLE user_auto_delete_config IS 'Configuração para exclusão automática de usuários vencidos';
COMMENT ON COLUMN user_auto_delete_config.days_after_expiration IS 'Número de dias após expiração para excluir automaticamente';
COMMENT ON COLUMN user_auto_delete_config.is_active IS 'Se a exclusão automática está ativa';

-- Inserir configuração padrão para códigos (60 dias)
INSERT INTO code_auto_delete_config (days_after_expiration, is_active)
VALUES (60, false)
ON CONFLICT (days_after_expiration) DO NOTHING;

-- Inserir configuração padrão para usuários (60 dias)
INSERT INTO user_auto_delete_config (days_after_expiration, is_active)
VALUES (60, false)
ON CONFLICT (days_after_expiration) DO NOTHING;
