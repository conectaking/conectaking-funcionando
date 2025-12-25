-- ============================================
-- SCRIPT COMPLETO: Criar tabela analytics_events e índices
-- ============================================
-- Data: 2025-12-21
-- Descrição: Script único para criar toda a estrutura de analytics
-- 
-- INSTRUÇÕES:
-- 1. Conecte ao banco PostgreSQL do Render
-- 2. Execute este script completo
-- 3. Verifique os resultados com as queries no final
-- ============================================

-- ============================================
-- PARTE 1: Criar tabela analytics_events
-- ============================================

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

-- ============================================
-- PARTE 2: Criar todos os índices
-- ============================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_id ON analytics_events(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Índices compostos para queries comuns
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_event_type ON analytics_events(item_id, event_type) WHERE item_id IS NOT NULL;

-- Índice para queries de período (usado nas rotas de analytics)
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type_created ON analytics_events(user_id, event_type, created_at);

-- Índice para profile_items (opcional, mas ajuda nas queries)
CREATE INDEX IF NOT EXISTS idx_profile_items_destination_url ON profile_items(destination_url) WHERE destination_url IS NOT NULL;

-- ============================================
-- PARTE 3: Adicionar comentários
-- ============================================

COMMENT ON TABLE analytics_events IS 'Armazena eventos de analytics (visualizações, cliques, downloads)';
COMMENT ON COLUMN analytics_events.user_id IS 'ID do usuário proprietário do perfil';
COMMENT ON COLUMN analytics_events.event_type IS 'Tipo de evento: view, click ou vcard_download';
COMMENT ON COLUMN analytics_events.item_id IS 'ID do item/link clicado (NULL para visualizações de perfil)';
COMMENT ON COLUMN analytics_events.ip_address IS 'Endereço IP do visitante';
COMMENT ON COLUMN analytics_events.user_agent IS 'User agent do navegador';

-- ============================================
-- PARTE 4: VERIFICAÇÕES (Execute após criar)
-- ============================================

-- Verificar se a tabela foi criada
SELECT 
    '✅ Tabela analytics_events criada com sucesso!' AS status,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'analytics_events'
    ) AS tabela_existe;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'analytics_events'
ORDER BY indexname;

-- Verificar se profile_items tem destination_url
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profile_items' 
            AND column_name = 'destination_url'
        ) THEN '✅ Coluna destination_url existe em profile_items'
        ELSE '❌ ATENÇÃO: Coluna destination_url NÃO existe em profile_items!'
    END AS status_destination_url;

-- Verificar dados existentes (se houver)
SELECT 
    COUNT(*) as total_eventos,
    COUNT(DISTINCT user_id) as usuarios_unicos,
    COUNT(DISTINCT item_id) as itens_unicos,
    COUNT(*) FILTER (WHERE event_type = 'view') as total_visualizacoes,
    COUNT(*) FILTER (WHERE event_type = 'click') as total_cliques,
    COUNT(*) FILTER (WHERE event_type = 'vcard_download') as total_downloads
FROM analytics_events;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- 
-- Se tudo foi executado com sucesso:
-- ✅ Tabela analytics_events criada
-- ✅ Índices criados
-- ✅ Estrutura verificada
-- 
-- Próximos passos:
-- 1. Recarregue a aplicação
-- 2. Teste o dashboard de analytics
-- 3. Os dados devem aparecer corretamente agora
-- ============================================
