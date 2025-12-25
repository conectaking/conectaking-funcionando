-- Migration: Adicionar índices para analytics_events
-- Data: 2025-12-21
-- Descrição: Adiciona índices adicionais para otimizar queries de analytics

-- Índices para analytics_events (se a tabela já existir sem esses índices)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_id ON analytics_events(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_event_type ON analytics_events(item_id, event_type) WHERE item_id IS NOT NULL;

-- Índice para queries de período (usado nas rotas de analytics)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type_created ON analytics_events(user_id, event_type, created_at);

-- Índice para profile_items (garantir que destination_url pode ser indexado se necessário)
CREATE INDEX IF NOT EXISTS idx_profile_items_destination_url ON profile_items(destination_url) WHERE destination_url IS NOT NULL;
