-- ===========================================
-- SCRIPT DE TESTE COM DIAGNÓSTICO
-- Execute este script e me diga o resultado
-- ===========================================

-- 1. Verificar se a tabela users existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'ERRO: Tabela users não existe!';
    ELSE
        RAISE NOTICE 'OK: Tabela users existe';
    END IF;
END $$;

-- 2. Tentar criar a tabela profile_tabs
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

-- 3. Verificar se foi criada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs') THEN
        RAISE NOTICE 'SUCESSO: Tabela profile_tabs foi criada!';
    ELSE
        RAISE EXCEPTION 'ERRO: Tabela profile_tabs NÃO foi criada!';
    END IF;
END $$;

-- 4. Mostrar resultado final
SELECT 'Tabela profile_tabs criada com sucesso!' as resultado;

