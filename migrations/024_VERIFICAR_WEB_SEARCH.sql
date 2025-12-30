-- ============================================
-- VERIFICAÇÃO DA MIGRATION 024 - Busca na Web
-- Execute esta query para verificar se a migration foi executada
-- ============================================

-- 1. Verificar se as tabelas existem
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'ia_web_search_config',
            'ia_web_search_cache',
            'ia_web_search_history'
        ) THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ia_web_search_config', 'ia_web_search_cache', 'ia_web_search_history')
ORDER BY table_name;

-- 2. Verificar estrutura da tabela ia_web_search_config
SELECT 
    'ia_web_search_config' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ia_web_search_config'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela ia_web_search_cache
SELECT 
    'ia_web_search_cache' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ia_web_search_cache'
ORDER BY ordinal_position;

-- 4. Verificar estrutura da tabela ia_web_search_history
SELECT 
    'ia_web_search_history' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ia_web_search_history'
ORDER BY ordinal_position;

-- 5. Verificar configuração padrão
SELECT 
    id,
    is_enabled,
    api_provider,
    CASE 
        WHEN api_key IS NULL THEN 'Não configurado'
        WHEN LENGTH(api_key) > 0 THEN 'Configurado (' || LEFT(api_key, 10) || '...)'
        ELSE 'Vazio'
    END as api_key_status,
    max_results,
    use_cache,
    updated_at
FROM ia_web_search_config
ORDER BY id DESC
LIMIT 1;

-- 6. Verificar índices criados
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('ia_web_search_config', 'ia_web_search_cache', 'ia_web_search_history')
ORDER BY tablename, indexname;

-- 7. Contagem de registros
SELECT 
    'ia_web_search_config' as tabela,
    COUNT(*) as total_registros
FROM ia_web_search_config
UNION ALL
SELECT 
    'ia_web_search_cache' as tabela,
    COUNT(*) as total_registros
FROM ia_web_search_cache
UNION ALL
SELECT 
    'ia_web_search_history' as tabela,
    COUNT(*) as total_registros
FROM ia_web_search_history;

-- 8. RESUMO FINAL
SELECT 
    'RESUMO DA VERIFICAÇÃO' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_web_search_config')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_web_search_cache')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_web_search_history')
        THEN '✅ TODAS AS TABELAS FORAM CRIADAS COM SUCESSO!'
        ELSE '❌ ALGUMAS TABELAS NÃO FORAM CRIADAS'
    END as status;

