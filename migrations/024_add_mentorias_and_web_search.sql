-- Migration: Adicionar tabelas para Mentorias e Configuração de Busca na Web
-- Data: 2025-01-31
-- Descrição: Sistema de mentorias e busca na internet para IA KING

-- ============================================
-- PARTE 1: Tabela de Mentorias
-- ============================================
CREATE TABLE IF NOT EXISTS ia_mentorias (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL, -- Conteúdo completo da mentoria
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    keywords TEXT[], -- Palavras-chave para busca
    video_url TEXT, -- URL de vídeo (YouTube, Vimeo, etc)
    audio_url TEXT, -- URL de áudio/podcast
    document_url TEXT, -- URL de documento relacionado
    duration_minutes INTEGER, -- Duração estimada em minutos
    difficulty_level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_by VARCHAR(255), -- ID do admin que criou
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_mentorias_category ON ia_mentorias(category_id);
CREATE INDEX IF NOT EXISTS idx_ia_mentorias_keywords ON ia_mentorias USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ia_mentorias_active ON ia_mentorias(is_active);

-- ============================================
-- PARTE 2: Configuração de Busca na Web
-- ============================================
CREATE TABLE IF NOT EXISTS ia_web_search_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    api_provider VARCHAR(50), -- 'google', 'serpapi', 'scraping', 'duckduckgo'
    api_key TEXT, -- Chave da API (criptografada se necessário)
    max_results INTEGER DEFAULT 5, -- Máximo de resultados por busca
    search_domains TEXT[], -- Domínios permitidos para busca
    blocked_domains TEXT[], -- Domínios bloqueados
    use_cache BOOLEAN DEFAULT true, -- Usar cache de buscas
    cache_duration_hours INTEGER DEFAULT 24, -- Duração do cache em horas
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração padrão
INSERT INTO ia_web_search_config (is_enabled, api_provider, max_results, use_cache)
VALUES (false, 'scraping', 5, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PARTE 3: Cache de Buscas na Web
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
-- PARTE 4: Histórico de Buscas
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
    (SELECT COUNT(*) FROM ia_mentorias) as total_mentorias,
    (SELECT COUNT(*) FROM ia_web_search_config) as total_configs;

