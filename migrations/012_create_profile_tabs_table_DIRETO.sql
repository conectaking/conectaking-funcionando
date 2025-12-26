-- Execute este script COMPLETO de uma vez
-- Selecione TUDO (Ctrl+A) e execute (Ctrl+Enter)

DROP TABLE IF EXISTS profile_tabs CASCADE;

CREATE TABLE profile_tabs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tab_name VARCHAR(100) NOT NULL,
    tab_icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    content_type VARCHAR(50) DEFAULT 'modules',
    content_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Verificar se foi criada
SELECT 'Tabela criada!' as status, table_name 
FROM information_schema.tables 
WHERE table_name = 'profile_tabs';

