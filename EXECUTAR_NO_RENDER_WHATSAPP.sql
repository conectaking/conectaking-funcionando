-- ===========================================
-- EXECUTAR NO RENDER - Adicionar coluna whatsapp
-- ===========================================
-- Execute este SQL no banco de dados do Render
-- Acesse: Render Dashboard > Seu serviço > Shell > psql

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
        
        RAISE NOTICE '✅ Coluna whatsapp adicionada com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna whatsapp já existe';
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
AND column_name = 'whatsapp';

-- Se a query acima retornar 1 linha, a coluna foi criada com sucesso!

