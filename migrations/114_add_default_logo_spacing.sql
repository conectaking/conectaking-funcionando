-- Migration: Adicionar DEFAULT 'center' à coluna logo_spacing
-- Data: 2026-01-23
-- Descrição: Adiciona valor padrão 'center' à coluna logo_spacing para evitar erros de constraint

DO $$ 
BEGIN
    -- Verificar se a coluna existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'logo_spacing'
    ) THEN
        -- Adicionar DEFAULT 'center' se não tiver
        ALTER TABLE user_profiles 
        ALTER COLUMN logo_spacing SET DEFAULT 'center';
        
        -- Atualizar valores NULL para 'center'
        UPDATE user_profiles 
        SET logo_spacing = 'center' 
        WHERE logo_spacing IS NULL;
        
        RAISE NOTICE 'DEFAULT ''center'' adicionado à coluna logo_spacing com sucesso';
    ELSE
        RAISE NOTICE 'Coluna logo_spacing não existe na tabela user_profiles';
    END IF;
END $$;

-- Verificação
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'logo_spacing';
