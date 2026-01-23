-- Migration: Adicionar coluna avatar_format à tabela user_profiles
-- Data: 2025-01-31
-- Descrição: Adiciona campo para controlar o formato do avatar (circular, square-full, square-small)

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'avatar_format'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN avatar_format VARCHAR(50) DEFAULT 'circular' 
        CHECK (avatar_format IN ('circular', 'square-full', 'square-small'));
        
        -- Atualizar registros existentes para usar 'circular' como padrão
        UPDATE user_profiles 
        SET avatar_format = 'circular' 
        WHERE avatar_format IS NULL;
        
        RAISE NOTICE 'Coluna avatar_format adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna avatar_format já existe na tabela user_profiles';
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
AND column_name = 'avatar_format';

