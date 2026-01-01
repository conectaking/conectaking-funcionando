-- Migration: Sistema de Aprendizado Adaptativo e Priorização Dinâmica
-- Data: 2025-01-01
-- Descrição: Adiciona tabelas para aprendizado adaptativo, priorização dinâmica e detecção de erros repetitivos

-- ============================================
-- TABELA: ESTATÍSTICAS DE CONHECIMENTO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_knowledge_stats (
    id SERIAL PRIMARY KEY,
    knowledge_id INTEGER NOT NULL,
    total_uses INTEGER DEFAULT 0,
    successful_uses INTEGER DEFAULT 0,
    failed_uses INTEGER DEFAULT 0,
    average_confidence DECIMAL(5,2) DEFAULT 0,
    last_used_at TIMESTAMP,
    success_rate DECIMAL(5,2) DEFAULT 0,
    dynamic_priority DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(knowledge_id)
);

-- Foreign key para ia_knowledge_base
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_knowledge_base') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ia_knowledge_stats_knowledge_id_fkey') THEN
        ALTER TABLE ia_knowledge_stats 
        ADD CONSTRAINT ia_knowledge_stats_knowledge_id_fkey 
        FOREIGN KEY (knowledge_id) REFERENCES ia_knowledge_base(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ia_knowledge_stats_knowledge_id ON ia_knowledge_stats(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_stats_dynamic_priority ON ia_knowledge_stats(dynamic_priority DESC);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_stats_success_rate ON ia_knowledge_stats(success_rate DESC);

-- ============================================
-- TABELA: ERROS REPETITIVOS
-- ============================================
CREATE TABLE IF NOT EXISTS ia_repetitive_errors (
    id SERIAL PRIMARY KEY,
    error_pattern TEXT NOT NULL,
    error_message TEXT,
    error_response TEXT,
    knowledge_ids INTEGER[],
    occurrence_count INTEGER DEFAULT 1,
    first_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT false,
    correction_suggested TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_repetitive_errors_pattern ON ia_repetitive_errors(error_pattern);
CREATE INDEX IF NOT EXISTS idx_ia_repetitive_errors_blocked ON ia_repetitive_errors(is_blocked);
CREATE INDEX IF NOT EXISTS idx_ia_repetitive_errors_count ON ia_repetitive_errors(occurrence_count DESC);

-- ============================================
-- TABELA: ESTRATÉGIAS DE RESPOSTA
-- ============================================
CREATE TABLE IF NOT EXISTS ia_response_strategies (
    id SERIAL PRIMARY KEY,
    strategy_type VARCHAR(100) NOT NULL, -- 'knowledge_search', 'synthesis', 'chain_of_thought', etc.
    question_pattern TEXT,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_confidence DECIMAL(5,2) DEFAULT 0,
    average_feedback_score DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 50,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_response_strategies_type ON ia_response_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_ia_response_strategies_priority ON ia_response_strategies(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ia_response_strategies_active ON ia_response_strategies(is_active);

-- ============================================
-- TABELA: HISTÓRICO DE APRENDIZADO ADAPTATIVO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_adaptive_learning_history (
    id SERIAL PRIMARY KEY,
    learning_type VARCHAR(50) NOT NULL, -- 'strategy_adjustment', 'priority_update', 'error_detection'
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    impact_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_adaptive_learning_type ON ia_adaptive_learning_history(learning_type);
CREATE INDEX IF NOT EXISTS idx_ia_adaptive_learning_created ON ia_adaptive_learning_history(created_at DESC);

-- ============================================
-- ADICIONAR COLUNAS À IA_KNOWLEDGE_BASE SE NÃO EXISTIREM
-- ============================================
DO $$ 
BEGIN
    -- Adicionar coluna success_rate se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ia_knowledge_base' AND column_name = 'success_rate') THEN
        ALTER TABLE ia_knowledge_base ADD COLUMN success_rate DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Adicionar coluna dynamic_priority se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ia_knowledge_base' AND column_name = 'dynamic_priority') THEN
        ALTER TABLE ia_knowledge_base ADD COLUMN dynamic_priority DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Adicionar coluna last_used_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ia_knowledge_base' AND column_name = 'last_used_at') THEN
        ALTER TABLE ia_knowledge_base ADD COLUMN last_used_at TIMESTAMP;
    END IF;
    
    -- Adicionar coluna use_count se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ia_knowledge_base' AND column_name = 'use_count') THEN
        ALTER TABLE ia_knowledge_base ADD COLUMN use_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_base_dynamic_priority ON ia_knowledge_base(dynamic_priority DESC);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_base_success_rate ON ia_knowledge_base(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_base_last_used ON ia_knowledge_base(last_used_at DESC);

-- Comentários
COMMENT ON TABLE ia_knowledge_stats IS 'Estatísticas de uso e sucesso de cada conhecimento para priorização dinâmica';
COMMENT ON TABLE ia_repetitive_errors IS 'Registro de erros repetitivos para evitar repetição';
COMMENT ON TABLE ia_response_strategies IS 'Estratégias de resposta com métricas de sucesso para aprendizado adaptativo';
COMMENT ON TABLE ia_adaptive_learning_history IS 'Histórico de ajustes adaptativos do sistema';

