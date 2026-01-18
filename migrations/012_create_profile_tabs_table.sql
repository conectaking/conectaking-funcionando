-- ===========================================
-- Migration: Criar tabela profile_tabs
-- Data: 2025-01-31
-- Descrição: Tabela para armazenar abas (tabs) do perfil público
-- ===========================================

CREATE TABLE IF NOT EXISTS profile_tabs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tab_name VARCHAR(100) NOT NULL,
    tab_icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    content_type VARCHAR(50) DEFAULT 'modules',
    content_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_profile_tabs_user_id ON profile_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_display_order ON profile_tabs(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_is_active ON profile_tabs(user_id, is_active) WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE profile_tabs IS 'Armazena as abas (tabs) do perfil público dos usuários';
COMMENT ON COLUMN profile_tabs.user_id IS 'ID do usuário proprietário da aba';
COMMENT ON COLUMN profile_tabs.tab_name IS 'Nome da aba exibido no cartão público';
COMMENT ON COLUMN profile_tabs.tab_icon IS 'Ícone FontAwesome para a aba (opcional)';
COMMENT ON COLUMN profile_tabs.display_order IS 'Ordem de exibição das abas';
COMMENT ON COLUMN profile_tabs.is_active IS 'Se a aba está ativa e deve ser exibida';
COMMENT ON COLUMN profile_tabs.content_type IS 'Tipo de conteúdo: modules, text, html, portfolio, about';
COMMENT ON COLUMN profile_tabs.content_data IS 'Dados do conteúdo da aba (texto, HTML, JSON, etc.)';

-- Trigger para atualizar updated_at automaticamente
-- Criar função primeiro
CREATE OR REPLACE FUNCTION update_profile_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (a tabela já foi criada acima)
DROP TRIGGER IF EXISTS trigger_update_profile_tabs_updated_at ON profile_tabs;
CREATE TRIGGER trigger_update_profile_tabs_updated_at
    BEFORE UPDATE ON profile_tabs
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_tabs_updated_at();

