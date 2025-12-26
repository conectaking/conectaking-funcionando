-- ===========================================
-- EXECUTE ESTE SCRIPT COMPLETO DE UMA VEZ
-- Selecione TUDO (Ctrl+A) e execute (Ctrl+Enter)
-- ===========================================

BEGIN;

-- 1. Criar a tabela profile_tabs
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

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_profile_tabs_user_id ON profile_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_display_order ON profile_tabs(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_is_active ON profile_tabs(user_id, is_active) WHERE is_active = TRUE;

-- 3. Criar função para trigger
CREATE OR REPLACE FUNCTION update_profile_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger (só se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs') THEN
        DROP TRIGGER IF EXISTS trigger_update_profile_tabs_updated_at ON profile_tabs;
        CREATE TRIGGER trigger_update_profile_tabs_updated_at
            BEFORE UPDATE ON profile_tabs
            FOR EACH ROW
            EXECUTE FUNCTION update_profile_tabs_updated_at();
        RAISE NOTICE 'Trigger criado com sucesso!';
    ELSE
        RAISE EXCEPTION 'Tabela profile_tabs não foi criada!';
    END IF;
END $$;

COMMIT;

-- 5. Verificar se foi criada
SELECT 'Tabela profile_tabs criada com sucesso!' as resultado;
SELECT table_name FROM information_schema.tables WHERE table_name = 'profile_tabs';

