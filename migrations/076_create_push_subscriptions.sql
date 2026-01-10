-- Migration: Notificações Push (Melhoria 21)
-- Data: 2025-01-31
-- Descrição: Sistema de notificações push usando Web Push API

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE, -- URL do serviço de push
    p256dh_key TEXT NOT NULL, -- Chave pública para criptografia
    auth_key TEXT NOT NULL, -- Chave de autenticação
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_notification_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES push_subscriptions(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created ON push_notifications(created_at);

COMMENT ON TABLE push_subscriptions IS 'Subscrições de notificações push dos usuários (Melhoria 21)';
COMMENT ON TABLE push_notifications IS 'Histórico de notificações push enviadas';
