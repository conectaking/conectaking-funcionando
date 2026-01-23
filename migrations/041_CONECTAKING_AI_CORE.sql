-- ============================================
-- MIGRATION: ConectaKing AI Core
-- Data: 2025-02-01
-- Descrição: Cria estrutura completa para a ConectaKing AI Core
-- ============================================

-- ============================================
-- PARTE 1: Tabela de Memória da AI Core
-- ============================================
CREATE TABLE IF NOT EXISTS ai_core_memory (
    id SERIAL PRIMARY KEY,
    memory_type VARCHAR(50) NOT NULL, -- 'knowledge_product', 'faq', 'validated_strategies', etc
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT[], -- Array de palavras-chave para busca
    metadata JSONB, -- Metadados adicionais em JSON
    usage_count INTEGER DEFAULT 0, -- Quantas vezes foi usado
    success_rate DECIMAL(5,2) DEFAULT 0, -- Taxa de sucesso (0-100)
    priority INTEGER DEFAULT 50, -- Prioridade (0-100, maior = mais importante)
    source VARCHAR(50) DEFAULT 'user_interaction', -- Origem do conhecimento
    replaced_by INTEGER REFERENCES ai_core_memory(id) ON DELETE SET NULL, -- Se foi substituído
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_ai_core_memory_type ON ai_core_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_core_memory_keywords ON ai_core_memory USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ai_core_memory_active ON ai_core_memory(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_core_memory_priority ON ai_core_memory(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_core_memory_content ON ai_core_memory USING GIN(to_tsvector('portuguese', content));

-- ============================================
-- PARTE 2: Treinamento Supervisionado
-- ============================================
CREATE TABLE IF NOT EXISTS ai_core_supervised_training (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE SET NULL,
    original_response TEXT NOT NULL,
    corrected_response TEXT NOT NULL,
    admin_id INTEGER NOT NULL, -- ID do admin que fez a correção
    reason TEXT, -- Motivo da correção
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
    applied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_core_training_admin ON ai_core_supervised_training(admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_core_training_status ON ai_core_supervised_training(status);
CREATE INDEX IF NOT EXISTS idx_ai_core_training_priority ON ai_core_supervised_training(priority);

-- ============================================
-- PARTE 3: Regras de Treinamento
-- ============================================
CREATE TABLE IF NOT EXISTS ai_core_training_rules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT[],
    category VARCHAR(100),
    admin_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_core_rules_active ON ai_core_training_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_core_rules_priority ON ai_core_training_rules(priority DESC);

-- ============================================
-- PARTE 4: Histórico de Aprendizado via API
-- ============================================
CREATE TABLE IF NOT EXISTS ai_core_api_learning_history (
    id SERIAL PRIMARY KEY,
    pattern_id INTEGER REFERENCES ai_core_memory(id) ON DELETE SET NULL,
    api_type VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', etc
    query TEXT NOT NULL,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_core_api_learning_type ON ai_core_api_learning_history(api_type);
CREATE INDEX IF NOT EXISTS idx_ai_core_api_learning_date ON ai_core_api_learning_history(learned_at DESC);

-- ============================================
-- PARTE 5: Análise da IA (Modo CEO)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_core_analysis (
    id SERIAL PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('maturity', 'strengths', 'weaknesses', 'recommendations', 'full')),
    analysis_result JSONB NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],
    maturity_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced', 'expert'
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analyzed_by INTEGER -- ID do admin que solicitou
);

CREATE INDEX IF NOT EXISTS idx_ai_core_analysis_type ON ai_core_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_core_analysis_date ON ai_core_analysis(analyzed_at DESC);

-- ============================================
-- PARTE 6: Estatísticas de Uso da IA
-- ============================================
CREATE TABLE IF NOT EXISTS ai_core_usage_stats (
    id SERIAL PRIMARY KEY,
    date_recorded DATE DEFAULT CURRENT_DATE,
    total_messages INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    avg_confidence DECIMAL(5,2) DEFAULT 0,
    intent_distribution JSONB, -- Distribuição de intenções
    module_usage JSONB, -- Uso de cada módulo
    memory_queries INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date_recorded)
);

CREATE INDEX IF NOT EXISTS idx_ai_core_usage_date ON ai_core_usage_stats(date_recorded DESC);

-- ============================================
-- PARTE 7: Comentários nas Tabelas
-- ============================================
COMMENT ON TABLE ai_core_memory IS 'Memória persistente da ConectaKing AI Core';
COMMENT ON TABLE ai_core_supervised_training IS 'Treinamento supervisionado por administradores';
COMMENT ON TABLE ai_core_training_rules IS 'Regras de treinamento definidas por administradores';
COMMENT ON TABLE ai_core_api_learning_history IS 'Histórico de aprendizado via APIs externas';
COMMENT ON TABLE ai_core_analysis IS 'Análises da IA (Modo CEO/Cérebro)';
COMMENT ON TABLE ai_core_usage_stats IS 'Estatísticas de uso da IA';

-- ============================================
-- PARTE 8: Inserir Dados Iniciais
-- ============================================

-- Inserir conhecimento inicial do produto
INSERT INTO ai_core_memory (memory_type, title, content, keywords, priority, source) VALUES
(
    'knowledge_product',
    'O que é o ConectaKing?',
    'O ConectaKing é uma plataforma completa para criação de cartões virtuais profissionais. Você pode adicionar links, redes sociais, módulos personalizados e muito mais!',
    ARRAY['conecta king', 'plataforma', 'cartão virtual', 'o que é'],
    90,
    'system'
),
(
    'knowledge_product',
    'Módulos Disponíveis',
    'Você pode adicionar diversos módulos como: WhatsApp, Instagram, TikTok, YouTube, Link Personalizado, Banner, Carrossel, Página de Vendas e muito mais!',
    ARRAY['módulos', 'adicionar', 'disponíveis', 'tipos'],
    85,
    'system'
),
(
    'faq',
    'Como usar o cartão virtual?',
    'Para usar o cartão virtual, acesse o painel, personalize seu cartão, adicione os módulos desejados e compartilhe o link com seus contatos.',
    ARRAY['como usar', 'cartão virtual', 'compartilhar'],
    80,
    'system'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- PARTE 9: Verificação Final
-- ============================================
SELECT 
    '✅ Migration ConectaKing AI Core executada com sucesso!' as status,
    (SELECT COUNT(*) FROM ai_core_memory) as total_memoria,
    (SELECT COUNT(*) FROM ai_core_supervised_training) as total_treinamentos,
    (SELECT COUNT(*) FROM ai_core_training_rules) as total_regras;

