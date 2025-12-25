-- ============================================
-- MIGRATION: Criar Tabela de Atividades dos Usuários
-- Data: 2025-12-21
-- Descrição: Tabela para rastrear todas as atividades dos usuários (logins, edições, etc)
-- ============================================

-- Criar tabela user_activities
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_type ON user_activities(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type_created ON user_activities(activity_type, created_at DESC);

-- Comentários
COMMENT ON TABLE user_activities IS 'Registra todas as atividades dos usuários para analytics e relatórios';
COMMENT ON COLUMN user_activities.activity_type IS 'Tipo de atividade: login, logout, profile_update, link_created, link_updated, link_deleted, settings_updated, etc';

-- Verificação
SELECT 'Tabela user_activities criada com sucesso!' as status;
SELECT COUNT(*) as total_activities FROM user_activities;
