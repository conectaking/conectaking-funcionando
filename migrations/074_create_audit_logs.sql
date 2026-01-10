-- Migration: Auditoria de Ações (Melhoria 16)
-- Data: 2025-01-31
-- Descrição: Sistema completo de auditoria para rastrear todas as ações importantes

-- Criar tabela primeiro sem foreign key
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255), -- Tipo correto: VARCHAR para corresponder à tabela users
    action_type VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', 'confirm', etc.
    resource_type VARCHAR(100) NOT NULL, -- 'form', 'guest', 'response', 'list', 'user', etc.
    resource_id INTEGER,
    resource_slug VARCHAR(255),
    details JSONB, -- Dados adicionais em formato JSON
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    status_code INTEGER,
    error_message TEXT,
    execution_time_ms INTEGER, -- Tempo de execução em milissegundos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar foreign key se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey'
    ) THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT audit_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key audit_logs_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING GIN(details);

COMMENT ON TABLE audit_logs IS 'Sistema de auditoria para rastrear todas as ações do sistema (Melhoria 16)';
COMMENT ON COLUMN audit_logs.details IS 'Dados adicionais da ação em formato JSON (payload, mudanças, etc)';
