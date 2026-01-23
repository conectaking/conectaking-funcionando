-- Migration: Adicionar campos para armazenar texto completo de módulos incluídos e não incluídos
-- Data: 2026-01-23
-- Descrição: Adiciona campos custom_included_modules e custom_excluded_modules para salvar o texto completo
--            que o usuário digita nos campos de edição, permitindo que apareça na página principal

DO $$
BEGIN
    -- Adicionar coluna custom_included_modules se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'custom_included_modules'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD COLUMN custom_included_modules TEXT;
        RAISE NOTICE 'Coluna custom_included_modules adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna custom_included_modules já existe.';
    END IF;
    
    -- Adicionar coluna custom_excluded_modules se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'custom_excluded_modules'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD COLUMN custom_excluded_modules TEXT;
        RAISE NOTICE 'Coluna custom_excluded_modules adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna custom_excluded_modules já existe.';
    END IF;
END $$;

-- Verificar as colunas adicionadas
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_plans'
AND column_name IN ('custom_included_modules', 'custom_excluded_modules');
