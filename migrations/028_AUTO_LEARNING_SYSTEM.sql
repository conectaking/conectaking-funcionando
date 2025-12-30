-- ============================================
-- MIGRATION: Sistema de Auto-Aprendizado da IA
-- Data: 2025-01-31
-- Descrição: Cria sistema para IA aprender automaticamente e melhorar sozinha
-- ============================================

-- ============================================
-- PARTE 1: Configuração de Auto-Aprendizado
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_learning_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    auto_search_enabled BOOLEAN DEFAULT false, -- Buscar automaticamente quando não encontrar resposta
    auto_book_search_enabled BOOLEAN DEFAULT false, -- Buscar livros automaticamente
    max_searches_per_day INTEGER DEFAULT 50, -- Máximo de buscas automáticas por dia
    search_topics TEXT[], -- Tópicos para pesquisar automaticamente
    learning_mode VARCHAR(50) DEFAULT 'conservative', -- 'conservative', 'aggressive', 'balanced'
    min_confidence_to_learn DECIMAL(5,2) DEFAULT 60.0, -- Confiança mínima para aprender
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração padrão (só se não existir)
INSERT INTO ia_auto_learning_config (
    is_enabled, 
    auto_search_enabled, 
    auto_book_search_enabled,
    max_searches_per_day,
    learning_mode
)
SELECT false, false, false, 50, 'conservative'
WHERE NOT EXISTS (SELECT 1 FROM ia_auto_learning_config);

-- ============================================
-- PARTE 2: Histórico de Auto-Aprendizado
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_learning_history (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'tavily', 'book_search', 'manual'
    confidence_score DECIMAL(5,2),
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    topic_category VARCHAR(100),
    keywords TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_ia_auto_learning_history_learned_at ON ia_auto_learning_history(learned_at);
CREATE INDEX IF NOT EXISTS idx_ia_auto_learning_history_source ON ia_auto_learning_history(source);

-- ============================================
-- PARTE 3: Contador de Buscas Diárias
-- ============================================
CREATE TABLE IF NOT EXISTS ia_daily_search_count (
    id SERIAL PRIMARY KEY,
    search_date DATE DEFAULT CURRENT_DATE UNIQUE,
    search_count INTEGER DEFAULT 0,
    book_search_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_daily_search_count_date ON ia_daily_search_count(search_date);

-- ============================================
-- PARTE 4: Tópicos para Auto-Pesquisa
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_search_topics (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL UNIQUE,
    priority INTEGER DEFAULT 50,
    last_searched_at TIMESTAMP,
    search_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tópicos padrão
INSERT INTO ia_auto_search_topics (topic, priority) VALUES
('Programação Neurolinguística', 100),
('Marketing Digital', 90),
('Vendas', 90),
('Gestão de Negócios', 85),
('Psicologia', 80),
('Desenvolvimento Pessoal', 85),
('Tecnologia', 75),
('Inteligência Artificial', 95)
ON CONFLICT (topic) DO NOTHING;

-- ============================================
-- PARTE 5: Mensagem de Sucesso
-- ============================================
SELECT 
    '✅ Sistema de Auto-Aprendizado criado com sucesso!' as status,
    (SELECT COUNT(*) FROM ia_auto_learning_config) as configs,
    (SELECT COUNT(*) FROM ia_auto_search_topics) as topics;

