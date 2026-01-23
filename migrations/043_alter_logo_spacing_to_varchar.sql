-- Migration: Alterar coluna logo_spacing para VARCHAR para aceitar 'left', 'center', 'right'
-- Data: 2026-01-03
-- Descrição: Altera o tipo de dados de logo_spacing de INTEGER para VARCHAR para armazenar alinhamento

DO $$ 
BEGIN
    -- Verificar se a coluna existe e é INTEGER
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'logo_spacing'
        AND data_type = 'integer'
    ) THEN
        -- Remover constraint de CHECK numérico se existir
        ALTER TABLE user_profiles 
        DROP CONSTRAINT IF EXISTS user_profiles_logo_spacing_check;
        
        -- Alterar tipo da coluna para VARCHAR usando USING para converter valores
        ALTER TABLE user_profiles 
        ALTER COLUMN logo_spacing TYPE VARCHAR(10) USING (
            CASE 
                WHEN logo_spacing::integer <= 5 THEN 'left'
                WHEN logo_spacing::integer >= 20 THEN 'right'
                ELSE 'center'
            END
        );
        
        -- Adicionar nova constraint para aceitar apenas 'left', 'center', 'right'
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_logo_spacing_check 
        CHECK (logo_spacing IS NULL OR logo_spacing IN ('left', 'center', 'right'));
        
        -- Atualizar valores NULL para 'center' (padrão)
        UPDATE user_profiles 
        SET logo_spacing = 'center' 
        WHERE logo_spacing IS NULL;
        
        RAISE NOTICE 'Coluna logo_spacing alterada para VARCHAR com sucesso';
    ELSE
        RAISE NOTICE 'Coluna logo_spacing não existe ou já é VARCHAR';
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

