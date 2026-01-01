-- Migration: Sistema de Monitoramento e Auto-Correção da IA
-- Data: 2024-12-XX
-- Descrição: Adiciona tabelas para monitoramento do sistema e auto-correção pela IA

-- ============================================
-- TABELA: MONITORAMENTO DO SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS ia_system_monitoring (
    id SERIAL PRIMARY KEY,
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('database', 'api', 'performance', 'error', 'security', 'configuration')),
    check_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'error', 'critical')),
    message TEXT,
    details JSONB, -- Detalhes específicos do check
    severity INTEGER DEFAULT 50 CHECK (severity >= 0 AND severity <= 100),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255), -- user_id ou 'auto'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_system_monitoring_status ON ia_system_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_ia_system_monitoring_type ON ia_system_monitoring(check_type);
CREATE INDEX IF NOT EXISTS idx_ia_system_monitoring_checked_at ON ia_system_monitoring(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_system_monitoring_resolved ON ia_system_monitoring(resolved_at) WHERE resolved_at IS NULL;

-- ============================================
-- TABELA: ERROS DETECTADOS
-- ============================================
CREATE TABLE IF NOT EXISTS ia_system_errors (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('database', 'api', 'code', 'performance', 'security', 'configuration', 'unknown')),
    error_category VARCHAR(100), -- 'connection', 'query', 'timeout', 'validation', etc
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_location VARCHAR(500), -- arquivo:linha ou endpoint
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    frequency INTEGER DEFAULT 1, -- Quantas vezes ocorreu
    first_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    resolution_method VARCHAR(50), -- 'manual', 'auto', 'ignored'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_system_errors_type ON ia_system_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_ia_system_errors_severity ON ia_system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_ia_system_errors_resolved ON ia_system_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_ia_system_errors_last_occurred ON ia_system_errors(last_occurred_at DESC);

-- ============================================
-- TABELA: CORREÇÕES PROPOSTAS PELA IA
-- ============================================
CREATE TABLE IF NOT EXISTS ia_system_fixes (
    id SERIAL PRIMARY KEY,
    error_id INTEGER REFERENCES ia_system_errors(id) ON DELETE CASCADE,
    monitoring_id INTEGER REFERENCES ia_system_monitoring(id) ON DELETE SET NULL,
    fix_type VARCHAR(50) NOT NULL CHECK (fix_type IN ('code', 'database', 'configuration', 'api', 'performance', 'security')),
    fix_description TEXT NOT NULL,
    fix_code TEXT, -- Código SQL, JavaScript, ou instruções
    fix_file_path VARCHAR(500), -- Caminho do arquivo a ser corrigido
    fix_line_number INTEGER, -- Linha específica (se aplicável)
    proposed_by VARCHAR(50) DEFAULT 'ia', -- 'ia' ou user_id
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed')),
    approval_required BOOLEAN DEFAULT true,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    applied_at TIMESTAMP,
    applied_by VARCHAR(255),
    rollback_available BOOLEAN DEFAULT false,
    rollback_code TEXT,
    test_result JSONB, -- Resultado do teste após aplicação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_system_fixes_error_id ON ia_system_fixes(error_id);
CREATE INDEX IF NOT EXISTS idx_ia_system_fixes_status ON ia_system_fixes(status);
CREATE INDEX IF NOT EXISTS idx_ia_system_fixes_type ON ia_system_fixes(fix_type);
CREATE INDEX IF NOT EXISTS idx_ia_system_fixes_pending ON ia_system_fixes(status) WHERE status = 'pending';

-- ============================================
-- TABELA: HISTÓRICO DE CORREÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS ia_system_fix_history (
    id SERIAL PRIMARY KEY,
    fix_id INTEGER REFERENCES ia_system_fixes(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'applied', 'rolled_back', 'tested')),
    action_by VARCHAR(255),
    action_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_system_fix_history_fix_id ON ia_system_fix_history(fix_id);
CREATE INDEX IF NOT EXISTS idx_ia_system_fix_history_created_at ON ia_system_fix_history(created_at DESC);

-- ============================================
-- TABELA: MÉTRICAS DE PERFORMANCE
-- ============================================
CREATE TABLE IF NOT EXISTS ia_system_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('api_response_time', 'database_query_time', 'memory_usage', 'cpu_usage', 'error_rate', 'request_count')),
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'MB', '%', 'count'
    threshold_warning NUMERIC(15,4),
    threshold_error NUMERIC(15,4),
    endpoint_path VARCHAR(500), -- Se for métrica de API
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_system_metrics_type ON ia_system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_ia_system_metrics_recorded_at ON ia_system_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_system_metrics_endpoint ON ia_system_metrics(endpoint_path) WHERE endpoint_path IS NOT NULL;

-- ============================================
-- TABELA: ANÁLISES DO SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS ia_system_analyses (
    id SERIAL PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('full', 'database', 'api', 'performance', 'security', 'code')),
    analysis_result JSONB NOT NULL, -- Resultado completo da análise
    issues_found INTEGER DEFAULT 0,
    issues_critical INTEGER DEFAULT 0,
    issues_warning INTEGER DEFAULT 0,
    recommendations TEXT[],
    analyzed_by VARCHAR(50) DEFAULT 'ia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_system_analyses_type ON ia_system_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ia_system_analyses_created_at ON ia_system_analyses(created_at DESC);

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================
COMMENT ON TABLE ia_system_monitoring IS 'Monitoramento contínuo do sistema (banco, APIs, performance)';
COMMENT ON TABLE ia_system_errors IS 'Erros detectados no sistema';
COMMENT ON TABLE ia_system_fixes IS 'Correções propostas pela IA (aguardando aprovação)';
COMMENT ON TABLE ia_system_fix_history IS 'Histórico de ações nas correções';
COMMENT ON TABLE ia_system_metrics IS 'Métricas de performance do sistema';
COMMENT ON TABLE ia_system_analyses IS 'Análises completas do sistema realizadas pela IA';

