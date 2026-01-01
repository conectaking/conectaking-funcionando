-- Migration: Melhorias Avançadas da IA
-- Data: 2024-12-XX
-- Descrição: Adiciona tabelas para feedback, preferências, correções, cache e memória contextual

-- ============================================
-- TABELA: FEEDBACK DO USUÁRIO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_user_feedback (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'correction', 'neutral')),
    feedback_text TEXT,
    knowledge_used_ids INTEGER[], -- IDs do conhecimento usado na resposta
    response_quality_score INTEGER CHECK (response_quality_score >= 0 AND response_quality_score <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_user_feedback_user_id ON ia_user_feedback(user_id);
CREATE INDEX idx_ia_user_feedback_conversation_id ON ia_user_feedback(conversation_id);
CREATE INDEX idx_ia_user_feedback_type ON ia_user_feedback(feedback_type);
CREATE INDEX idx_ia_user_feedback_created_at ON ia_user_feedback(created_at);

-- ============================================
-- TABELA: PREFERÊNCIAS DO USUÁRIO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferred_style VARCHAR(50) DEFAULT 'balanced' CHECK (preferred_style IN ('technical', 'simple', 'detailed', 'balanced')),
    knowledge_level VARCHAR(50) DEFAULT 'intermediate' CHECK (knowledge_level IN ('beginner', 'intermediate', 'advanced')),
    interests TEXT[], -- Array de categorias de interesse
    language_preference VARCHAR(20) DEFAULT 'balanced' CHECK (language_preference IN ('formal', 'informal', 'balanced')),
    response_length_preference VARCHAR(20) DEFAULT 'medium' CHECK (response_length_preference IN ('short', 'medium', 'long')),
    topics_blacklist TEXT[], -- Tópicos que o usuário não quer ver
    topics_whitelist TEXT[], -- Tópicos preferidos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_user_preferences_user_id ON ia_user_preferences(user_id);

-- ============================================
-- TABELA: CORREÇÕES DE CONHECIMENTO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_knowledge_corrections (
    id SERIAL PRIMARY KEY,
    knowledge_id INTEGER REFERENCES ia_knowledge_base(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE SET NULL,
    original_content TEXT NOT NULL,
    corrected_content TEXT NOT NULL,
    correction_reason TEXT,
    verified BOOLEAN DEFAULT false,
    verification_count INTEGER DEFAULT 0, -- Quantas vezes foi verificada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_knowledge_corrections_knowledge_id ON ia_knowledge_corrections(knowledge_id);
CREATE INDEX idx_ia_knowledge_corrections_user_id ON ia_knowledge_corrections(user_id);
CREATE INDEX idx_ia_knowledge_corrections_verified ON ia_knowledge_corrections(verified);

-- ============================================
-- TABELA: CACHE DE RESPOSTAS
-- ============================================
CREATE TABLE IF NOT EXISTS ia_response_cache (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE NOT NULL, -- Hash da pergunta
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    knowledge_used_ids INTEGER[], -- IDs do conhecimento usado
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    hit_count INTEGER DEFAULT 0, -- Quantas vezes foi usado
    last_hit_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL, -- TTL baseado em frequência
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_response_cache_query_hash ON ia_response_cache(query_hash);
CREATE INDEX idx_ia_response_cache_expires_at ON ia_response_cache(expires_at);
CREATE INDEX idx_ia_response_cache_category_id ON ia_response_cache(category_id);
CREATE INDEX idx_ia_response_cache_last_hit_at ON ia_response_cache(last_hit_at);

-- ============================================
-- TABELA: CONTEXTO DE CONVERSA (MEMÓRIA)
-- ============================================
CREATE TABLE IF NOT EXISTS ia_conversation_context (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE CASCADE,
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('preference', 'fact', 'correction', 'topic', 'entity')),
    context_key VARCHAR(255) NOT NULL, -- Chave do contexto (ex: "preferência_estilo", "fato_sobre_X")
    context_value TEXT NOT NULL, -- Valor do contexto
    importance_score INTEGER DEFAULT 50 CHECK (importance_score >= 0 AND importance_score <= 100),
    expires_at TIMESTAMP, -- NULL = permanente
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_conversation_context_user_id ON ia_conversation_context(user_id);
CREATE INDEX idx_ia_conversation_context_conversation_id ON ia_conversation_context(conversation_id);
CREATE INDEX idx_ia_conversation_context_type ON ia_conversation_context(context_type);
CREATE INDEX idx_ia_conversation_context_key ON ia_conversation_context(context_key);
CREATE INDEX idx_ia_conversation_context_expires_at ON ia_conversation_context(expires_at);

-- ============================================
-- TABELA: SUGESTÕES DE PERGUNTAS
-- ============================================
CREATE TABLE IF NOT EXISTS ia_question_suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE CASCADE,
    suggested_question TEXT NOT NULL,
    suggestion_type VARCHAR(50) DEFAULT 'related' CHECK (suggestion_type IN ('related', 'category', 'popular', 'contextual')),
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    knowledge_ids INTEGER[], -- IDs do conhecimento relacionado
    clicked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_question_suggestions_user_id ON ia_question_suggestions(user_id);
CREATE INDEX idx_ia_question_suggestions_conversation_id ON ia_question_suggestions(conversation_id);
CREATE INDEX idx_ia_question_suggestions_type ON ia_question_suggestions(suggestion_type);
CREATE INDEX idx_ia_question_suggestions_clicked ON ia_question_suggestions(clicked);

-- ============================================
-- TABELA: MÉTRICAS DE SATISFAÇÃO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_satisfaction_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_conversations INTEGER DEFAULT 0,
    positive_feedback_count INTEGER DEFAULT 0,
    negative_feedback_count INTEGER DEFAULT 0,
    neutral_feedback_count INTEGER DEFAULT 0,
    average_quality_score NUMERIC(5,2) DEFAULT 0,
    average_response_time NUMERIC(10,3) DEFAULT 0, -- em segundos
    unanswered_questions_count INTEGER DEFAULT 0,
    cache_hit_rate NUMERIC(5,2) DEFAULT 0, -- % de cache hits
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_satisfaction_metrics_date ON ia_satisfaction_metrics(date);

-- ============================================
-- ADICIONAR COLUNAS EXISTENTES SE NECESSÁRIO
-- ============================================

-- Adicionar coluna de conhecimento usado nas conversas (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_conversations' AND column_name = 'knowledge_used_ids'
    ) THEN
        ALTER TABLE ia_conversations ADD COLUMN knowledge_used_ids INTEGER[];
    END IF;
END $$;

-- Adicionar coluna de tempo de resposta (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_conversations' AND column_name = 'response_time_ms'
    ) THEN
        ALTER TABLE ia_conversations ADD COLUMN response_time_ms INTEGER;
    END IF;
END $$;

-- Adicionar coluna de qualidade da resposta (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_conversations' AND column_name = 'response_quality_score'
    ) THEN
        ALTER TABLE ia_conversations ADD COLUMN response_quality_score INTEGER CHECK (response_quality_score >= 0 AND response_quality_score <= 100);
    END IF;
END $$;

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================
COMMENT ON TABLE ia_user_feedback IS 'Armazena feedback dos usuários sobre respostas da IA';
COMMENT ON TABLE ia_user_preferences IS 'Armazena preferências e configurações do usuário para personalização';
COMMENT ON TABLE ia_knowledge_corrections IS 'Armazena correções feitas pelos usuários no conhecimento da IA';
COMMENT ON TABLE ia_response_cache IS 'Cache de respostas para melhorar performance';
COMMENT ON TABLE ia_conversation_context IS 'Memória contextual de conversas para personalização';
COMMENT ON TABLE ia_question_suggestions IS 'Sugestões de perguntas relacionadas para o usuário';
COMMENT ON TABLE ia_satisfaction_metrics IS 'Métricas diárias de satisfação e performance da IA';

