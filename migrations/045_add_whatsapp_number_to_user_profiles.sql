-- Migration: Adicionar coluna whatsapp_number à tabela user_profiles
-- Data: 2025-01-31
-- Descrição: Adiciona campo para armazenar o número de WhatsApp do perfil, usado no vCard

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN whatsapp_number VARCHAR(20);
        
        RAISE NOTICE 'Coluna whatsapp_number adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna whatsapp_number já existe na tabela user_profiles';
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
AND column_name = 'whatsapp_number';

