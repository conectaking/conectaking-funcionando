-- ===========================================
-- Migration: Criar tabela de analytics do Formulário King
-- Data: 2026-01-05
-- Descrição: Rastreia visualizações, cliques e submissões dos formulários
-- ===========================================

-- Criar tabela para analytics
CREATE TABLE IF NOT EXISTS digital_form_analytics (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'submit', 'start', 'abandon'
    user_ip VARCHAR(45), -- IPv4 ou IPv6
    user_agent TEXT,
    referer TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_digital_form_analytics_profile_item ON digital_form_analytics(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_digital_form_analytics_event_type ON digital_form_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_digital_form_analytics_created_at ON digital_form_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_form_analytics_session ON digital_form_analytics(session_id);

COMMENT ON TABLE digital_form_analytics IS 'Rastreia eventos de analytics dos formulários digitais (views, clicks, submissions)';
COMMENT ON COLUMN digital_form_analytics.event_type IS 'Tipo de evento: view, click, submit, start, abandon';
COMMENT ON COLUMN digital_form_analytics.session_id IS 'ID da sessão do usuário para rastreamento';

