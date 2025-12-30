-- Migration: Adicionar coluna share_image_url à tabela user_profiles
-- Data: 2025-01-31
-- Descrição: Adiciona campo para imagem customizada de compartilhamento (og:image)

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'share_image_url'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN share_image_url TEXT;
        
        RAISE NOTICE 'Coluna share_image_url adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna share_image_url já existe na tabela user_profiles';
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
AND column_name = 'share_image_url';

