-- Migration: Criar tabela de analytics_events
-- Data: 2025-12-21
-- Descrição: Cria a tabela analytics_events para armazenar eventos de visualização e cliques

CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'click', 'vcard_download')),
    item_id INTEGER NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES profile_items(id) ON DELETE SET NULL
);

-- Índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_id ON analytics_events(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_event_type ON analytics_events(item_id, event_type) WHERE item_id IS NOT NULL;

-- Comentários sobre a tabela
COMMENT ON TABLE analytics_events IS 'Armazena eventos de analytics (visualizações, cliques, downloads)';
COMMENT ON COLUMN analytics_events.user_id IS 'ID do usuário proprietário do perfil';
COMMENT ON COLUMN analytics_events.event_type IS 'Tipo de evento: view, click ou vcard_download';
COMMENT ON COLUMN analytics_events.item_id IS 'ID do item/link clicado (NULL para visualizações de perfil)';
COMMENT ON COLUMN analytics_events.ip_address IS 'Endereço IP do visitante';
COMMENT ON COLUMN analytics_events.user_agent IS 'User agent do navegador';
