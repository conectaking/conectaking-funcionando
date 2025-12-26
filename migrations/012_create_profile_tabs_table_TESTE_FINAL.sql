-- COPIE E COLE ESTE SCRIPT COMPLETO NO DBEAVER
-- Selecione TUDO e execute (Ctrl+A e depois Ctrl+Enter)

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
    updated_at TIMESTAMP DEFAULT NOW()
);

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs')
        THEN 'SUCESSO: Tabela criada!'
        ELSE 'ERRO: Tabela NÃO criada!'
    END as resultado;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_tabs'
ORDER BY ordinal_position;

