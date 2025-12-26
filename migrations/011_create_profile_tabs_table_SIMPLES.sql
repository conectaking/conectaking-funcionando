-- ===========================================
-- VERSÃO SIMPLIFICADA - Execute este script
-- ===========================================

-- PASSO 1: Criar tabela (execute esta parte primeiro)
CREATE TABLE IF NOT EXISTS profile_tabs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
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

-- PASSO 2: Criar índices (execute depois do PASSO 1)
CREATE INDEX IF NOT EXISTS idx_profile_tabs_user_id ON profile_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_display_order ON profile_tabs(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_is_active ON profile_tabs(user_id, is_active) WHERE is_active = TRUE;

-- PASSO 3: Criar função (execute depois do PASSO 2)
CREATE OR REPLACE FUNCTION update_profile_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 4: Criar trigger (execute DEPOIS que a tabela foi criada no PASSO 1)
DROP TRIGGER IF EXISTS trigger_update_profile_tabs_updated_at ON profile_tabs;
CREATE TRIGGER trigger_update_profile_tabs_updated_at
    BEFORE UPDATE ON profile_tabs
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_tabs_updated_at();

