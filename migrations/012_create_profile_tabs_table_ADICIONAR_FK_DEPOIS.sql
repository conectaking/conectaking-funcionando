-- ===========================================
-- Execute este script DEPOIS que a tabela foi criada
-- Este script adiciona a foreign key
-- ===========================================

-- Adicionar foreign key DEPOIS que a tabela existe
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs') THEN
        RAISE EXCEPTION 'ERRO: A tabela profile_tabs não existe! Execute primeiro o script SEM_FK_PRIMEIRO.sql';
    END IF;
    
    -- Verificar se a foreign key já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'profile_tabs' 
        AND constraint_name LIKE '%user_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Adicionar foreign key
        ALTER TABLE profile_tabs
        ADD CONSTRAINT fk_profile_tabs_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'SUCESSO: Foreign key adicionada!';
    ELSE
        RAISE NOTICE 'Foreign key já existe!';
    END IF;
END $$;

-- Verificar se a FK foi adicionada
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'profile_tabs' 
AND constraint_type = 'FOREIGN KEY';

