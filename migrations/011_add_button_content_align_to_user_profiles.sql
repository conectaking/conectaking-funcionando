-- Migration: Adicionar coluna button_content_align à tabela user_profiles
-- Data: 2025-12-25
-- Descrição: Adiciona campo para controlar o alinhamento do conteúdo dos botões (left, center, right)

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'button_content_align'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN button_content_align VARCHAR(10) DEFAULT 'center' 
        CHECK (button_content_align IN ('left', 'center', 'right'));
        
        -- Atualizar registros existentes para usar 'center' como padrão
        UPDATE user_profiles 
        SET button_content_align = 'center' 
        WHERE button_content_align IS NULL;
        
        RAISE NOTICE 'Coluna button_content_align adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna button_content_align já existe na tabela user_profiles';
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
AND column_name = 'button_content_align';

