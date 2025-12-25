-- Migration: Criar tabela de atividades dos usuários
-- Data: 2025-12-21
-- Descrição: Rastreia todas as atividades dos usuários (logins, edições, etc) para analytics avançado

CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSONB NULL, -- Para armazenar dados extras específicos da atividade
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

-- Comentários sobre os tipos de atividade
COMMENT ON TABLE user_activities IS 'Registra todas as atividades dos usuários para analytics e relatórios';
COMMENT ON COLUMN user_activities.activity_type IS 'Tipo de atividade: login, logout, profile_update, link_created, link_updated, link_deleted, profile_viewed, settings_updated, etc';
COMMENT ON COLUMN user_activities.metadata IS 'JSON com dados extras específicos da atividade (ex: quais campos foram atualizados)';
