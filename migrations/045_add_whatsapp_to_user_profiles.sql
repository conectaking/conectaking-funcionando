-- Migration: Adicionar campo whatsapp à tabela user_profiles
-- Este campo armazena o número de WhatsApp do perfil para ser usado no vCard (Salvar Contato)

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN whatsapp VARCHAR(20);
        
        -- Comentário na coluna
        COMMENT ON COLUMN user_profiles.whatsapp IS 'Número de WhatsApp do perfil (apenas dígitos, usado no vCard para Salvar Contato)';
        
        RAISE NOTICE 'Coluna whatsapp adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna whatsapp já existe';
    END IF;
END $$;

