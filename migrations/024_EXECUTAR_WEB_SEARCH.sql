-- ============================================
-- MIGRATION: Configuração de Busca na Web para IA KING
-- Data: 2025-01-31
-- Descrição: Cria tabelas para configuração de busca na web (Tavily, etc.)
-- ============================================

-- ============================================
-- PARTE 1: Configuração de Busca na Web
-- ============================================
CREATE TABLE IF NOT EXISTS ia_web_search_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    api_provider VARCHAR(50) DEFAULT 'scraping', -- 'tavily', 'scraping', 'duckduckgo'
    api_key TEXT, -- Chave da API (ex: tvly-dev-xxxxx)
    max_results INTEGER DEFAULT 5, -- Máximo de resultados por busca
    search_domains TEXT[], -- Domínios permitidos para busca
    blocked_domains TEXT[], -- Domínios bloqueados
    use_cache BOOLEAN DEFAULT true, -- Usar cache de buscas
    cache_duration_hours INTEGER DEFAULT 24, -- Duração do cache em horas
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração padrão (só se não existir)
INSERT INTO ia_web_search_config (is_enabled, api_provider, max_results, use_cache)
SELECT false, 'scraping', 5, true
WHERE NOT EXISTS (SELECT 1 FROM ia_web_search_config);

-- ============================================
-- PARTE 2: Cache de Buscas na Web
-- ============================================
CREATE TABLE IF NOT EXISTS ia_web_search_cache (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results JSONB NOT NULL, -- Resultados da busca em JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(query)
);

CREATE INDEX IF NOT EXISTS idx_ia_web_search_cache_query ON ia_web_search_cache(query);
CREATE INDEX IF NOT EXISTS idx_ia_web_search_cache_expires ON ia_web_search_cache(expires_at);

-- ============================================
-- PARTE 3: Histórico de Buscas
-- ============================================
CREATE TABLE IF NOT EXISTS ia_web_search_history (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_web_search_history_created ON ia_web_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_web_search_history_query ON ia_web_search_history(query);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 
    '✅ Migration executada com sucesso!' as status,
    (SELECT COUNT(*) FROM ia_web_search_config) as total_configs,
    (SELECT COUNT(*) FROM ia_web_search_cache) as total_cache_entries,
    (SELECT COUNT(*) FROM ia_web_search_history) as total_history_entries;

