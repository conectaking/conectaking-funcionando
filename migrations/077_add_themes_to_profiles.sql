-- Migration: Temas Personalizáveis (Melhoria 22)
-- Data: 2025-01-31
-- Descrição: Adiciona suporte a temas personalizáveis nos perfis

-- Criar tabela primeiro sem foreign key
CREATE TABLE IF NOT EXISTS user_themes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE, -- Tipo correto: VARCHAR para corresponder à tabela users
    theme_name VARCHAR(100) DEFAULT 'default',
    custom_colors JSONB, -- { primary: '#FFC700', secondary: '#4A90E2', background: '#0D0D0F', etc }
    custom_fonts JSONB, -- { heading: 'Manrope', body: 'Inter', etc }
    custom_css TEXT, -- CSS customizado adicional
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar foreign key se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_themes_user_id_fkey'
    ) THEN
        ALTER TABLE user_themes 
        ADD CONSTRAINT user_themes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key user_themes_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

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
