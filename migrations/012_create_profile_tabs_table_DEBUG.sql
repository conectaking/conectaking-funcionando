-- ===========================================
-- SCRIPT COM DEBUG - Execute e verifique os LOGS
-- ===========================================

-- Tentar criar a tabela e capturar erros
DO $$
BEGIN
    -- Tentar criar a tabela
    BEGIN
        EXECUTE 'CREATE TABLE IF NOT EXISTS profile_tabs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            tab_name VARCHAR(100) NOT NULL,
            tab_icon VARCHAR(50),
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            content_type VARCHAR(50) DEFAULT ''modules'',
            content_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )';
        
        RAISE NOTICE 'Tentativa de criar tabela executada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERRO ao criar tabela: %', SQLERRM;
        RAISE;
    END;
END $$;

-- Verificar se foi criada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs') THEN
        RAISE NOTICE 'SUCESSO: Tabela profile_tabs EXISTE!';
    ELSE
        RAISE NOTICE 'ERRO: Tabela profile_tabs NÃO EXISTE!';
    END IF;
END $$;

-- Verificar também no schema público
SELECT 
    table_schema,
    table_name
FROM information_schema.tables 
WHERE table_name = 'profile_tabs';

-- Mostrar todas as tabelas para verificar o schema
SELECT 
    table_schema,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

