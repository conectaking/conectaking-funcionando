-- Migration: Notificações Push (Melhoria 21)
-- Data: 2025-01-31
-- Descrição: Sistema de notificações push usando Web Push API

-- Criar tabela primeiro sem foreign key
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Tipo correto: VARCHAR para corresponder à tabela users
    endpoint TEXT NOT NULL UNIQUE, -- URL do serviço de push
    p256dh_key TEXT NOT NULL, -- Chave pública para criptografia
    auth_key TEXT NOT NULL, -- Chave de autenticação
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_notification_at TIMESTAMP
);

-- Adicionar foreign key se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'push_subscriptions_user_id_fkey'
    ) THEN
        ALTER TABLE push_subscriptions 
        ADD CONSTRAINT push_subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key push_subscriptions_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

-- Criar tabela push_notifications após push_subscriptions
CREATE TABLE IF NOT EXISTS push_notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255), -- Tipo correto: VARCHAR para corresponder à tabela users
    subscription_id INTEGER, -- Referência será adicionada abaixo
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url TEXT,
    badge_url TEXT,
    data JSONB, -- Dados adicionais
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'expired')),
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar foreign keys para push_notifications
DO $$ 
BEGIN
    -- Foreign key para users
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'push_notifications_user_id_fkey'
    ) THEN
        ALTER TABLE push_notifications 
        ADD CONSTRAINT push_notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key push_notifications_user_id_fkey criada com sucesso';
    END IF;
    
    -- Foreign key para push_subscriptions
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'push_subscriptions'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'push_notifications_subscription_id_fkey'
    ) THEN
        ALTER TABLE push_notifications 
        ADD CONSTRAINT push_notifications_subscription_id_fkey 
        FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key push_notifications_subscription_id_fkey criada com sucesso';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created ON push_notifications(created_at);

COMMENT ON TABLE push_subscriptions IS 'Subscrições de notificações push dos usuários (Melhoria 21)';
COMMENT ON TABLE push_notifications IS 'Histórico de notificações push enviadas';
