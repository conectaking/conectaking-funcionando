-- ============================================
-- VERIFICAÇÃO DA MIGRATION 021
-- Execute esta query para verificar se a migration foi executada com sucesso
-- ============================================

-- 1. Verificar se o valor 'individual_com_logo' foi adicionado ao ENUM
SELECT 
    'Verificação do ENUM' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'individual_com_logo' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
        ) THEN '✅ individual_com_logo existe no account_type_enum'
        ELSE '❌ individual_com_logo NÃO existe no account_type_enum'
    END as status;

-- 2. Verificar se a tabela module_plan_availability existe
SELECT 
    'Verificação da Tabela' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'module_plan_availability'
        ) THEN '✅ Tabela module_plan_availability existe'
        ELSE '❌ Tabela module_plan_availability NÃO existe'
    END as status;

-- 3. Verificar estrutura da tabela (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'module_plan_availability'
ORDER BY ordinal_position;

-- 4. Contar registros na tabela (se existir)
SELECT 
    'Contagem de Registros' as verificacao,
    COUNT(*) as total_registros,
    COUNT(DISTINCT module_type) as total_modulos,
    COUNT(DISTINCT plan_code) as total_planos
FROM module_plan_availability;

-- 5. Mostrar alguns registros de exemplo
SELECT 
    module_type,
    plan_code,
    is_available,
    created_at
FROM module_plan_availability
ORDER BY module_type, plan_code
LIMIT 20;

-- 6. Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'module_plan_availability';

