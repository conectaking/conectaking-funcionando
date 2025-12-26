-- ===========================================
-- SCRIPT MÍNIMO - Apenas criar a tabela
-- Execute este script primeiro para testar
-- ===========================================

-- Criar apenas a tabela (sem trigger, sem índices extras)
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

-- Verificar se foi criada
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs')
        THEN 'SUCESSO: Tabela profile_tabs foi criada!'
        ELSE 'ERRO: Tabela profile_tabs NÃO foi criada!'
    END as resultado;

