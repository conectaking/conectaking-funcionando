-- Migration: Adicionar coluna logo_spacing à tabela user_profiles
-- Data: 2026-01-03
-- Descrição: Adiciona campo para controlar o espaçamento entre a logo e o texto nos botões (em pixels)

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'logo_spacing'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN logo_spacing INTEGER DEFAULT 12 
        CHECK (logo_spacing >= 0 AND logo_spacing <= 100);
        
        -- Atualizar registros existentes para usar 12px como padrão
        UPDATE user_profiles 
        SET logo_spacing = 12 
        WHERE logo_spacing IS NULL;
        
        RAISE NOTICE 'Coluna logo_spacing adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna logo_spacing já existe na tabela user_profiles';
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

