-- ============================================
-- MIGRATION 036: SISTEMA AUTOMÁTICO DE DESCOBERTA DE CATEGORIAS
-- ============================================
-- Implementa sistema para IA descobrir e adicionar categorias automaticamente
-- Data: Dezembro 2024

-- Tabela de descoberta de categorias
CREATE TABLE IF NOT EXISTS ia_category_discovery (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    discovered_from TEXT, -- 'web_search', 'knowledge_analysis', 'user_question', 'book_content'
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- Confiança na categoria (0-1)
    evidence_count INTEGER DEFAULT 1, -- Quantas vezes foi encontrada
    related_categories TEXT[], -- Categorias relacionadas
    keywords TEXT[], -- Palavras-chave associadas
    description TEXT,
    priority INTEGER DEFAULT 50,
    suggested_by VARCHAR(100) DEFAULT 'ia_auto_discovery',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'auto_added'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by VARCHAR(255)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_category_discovery_status ON ia_category_discovery(status);
CREATE INDEX IF NOT EXISTS idx_category_discovery_confidence ON ia_category_discovery(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_category_discovery_name ON ia_category_discovery(category_name);

-- Tabela de análise de categorias (para entender quais categorias são mais usadas)
CREATE TABLE IF NOT EXISTS ia_category_usage_analysis (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    knowledge_items_count INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    avg_confidence DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_category_usage_category ON ia_category_usage_analysis(category_id);
CREATE INDEX IF NOT EXISTS idx_category_usage_count ON ia_category_usage_analysis(usage_count DESC);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_category_discovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_discovery_updated_at
    BEFORE UPDATE ON ia_category_discovery
    FOR EACH ROW
    EXECUTE FUNCTION update_category_discovery_updated_at();

-- Comentários
COMMENT ON TABLE ia_category_discovery IS 'Categorias descobertas automaticamente pela IA';
COMMENT ON TABLE ia_category_usage_analysis IS 'Análise de uso de categorias para identificar necessidades';

