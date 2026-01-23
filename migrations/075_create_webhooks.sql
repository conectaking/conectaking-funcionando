-- Migration: API Webhooks (Melhoria 20)
-- Data: 2025-01-31
-- Descrição: Sistema de webhooks para integração com serviços externos

-- Criar tabela primeiro sem foreign key
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Tipo correto: VARCHAR para corresponder à tabela users
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- Array de eventos: ['form.submit', 'guest.confirm', 'response.create', etc]
    secret_token VARCHAR(255), -- Token para assinatura HMAC
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3, -- Quantas tentativas fazer em caso de falha
    timeout_ms INTEGER DEFAULT 30000, -- Timeout em milissegundos (30s padrão)
    headers JSONB, -- Headers customizados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP
);

-- Adicionar foreign key se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'webhooks_user_id_fkey'
    ) THEN
        ALTER TABLE webhooks 
        ADD CONSTRAINT webhooks_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key webhooks_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

-- Criar tabela webhook_deliveries após webhooks
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL, -- Referência será adicionada abaixo
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    http_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    next_retry_at TIMESTAMP
);

-- Adicionar foreign key para webhook_deliveries
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'webhooks'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'webhook_deliveries_webhook_id_fkey'
    ) THEN
        ALTER TABLE webhook_deliveries 
        ADD CONSTRAINT webhook_deliveries_webhook_id_fkey 
        FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key webhook_deliveries_webhook_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela webhooks não existe ou constraint já existe)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);

COMMENT ON TABLE webhooks IS 'Configuração de webhooks para integração externa (Melhoria 20)';
COMMENT ON TABLE webhook_deliveries IS 'Histórico de entregas de webhooks';
