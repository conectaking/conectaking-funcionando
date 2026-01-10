-- Migration: Temas Personalizáveis (Melhoria 22)
-- Data: 2025-01-31
-- Descrição: Adiciona suporte a temas personalizáveis nos perfis

CREATE TABLE IF NOT EXISTS user_themes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme_name VARCHAR(100) DEFAULT 'default',
    custom_colors JSONB, -- { primary: '#FFC700', secondary: '#4A90E2', background: '#0D0D0F', etc }
    custom_fonts JSONB, -- { heading: 'Manrope', body: 'Inter', etc }
    custom_css TEXT, -- CSS customizado adicional
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_themes_user ON user_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_themes_active ON user_themes(is_active);

-- Adicionar campo de tema preferido aos perfis de usuário
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'preferred_theme') THEN
        ALTER TABLE user_profiles 
        ADD COLUMN preferred_theme VARCHAR(100) DEFAULT 'default';
    END IF;
END $$;

COMMENT ON TABLE user_themes IS 'Temas personalizáveis dos usuários (Melhoria 22)';
COMMENT ON COLUMN user_profiles.preferred_theme IS 'Tema preferido do usuário (default, dark, light, custom)';
