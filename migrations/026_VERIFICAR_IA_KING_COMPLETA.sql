-- ============================================
-- VERIFICAÇÃO COMPLETA DO BANCO DE DADOS IA KING
-- Execute este script para verificar todas as tabelas e funcionalidades
-- ============================================

-- 1. Verificar todas as tabelas da IA KING
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'ia_categories',
            'ia_knowledge_base',
            'ia_documents',
            'ia_qa',
            'ia_conversations',
            'ia_learning',
            'ia_statistics',
            'ia_mentorias',
            'ia_web_search_config',
            'ia_web_search_cache',
            'ia_web_search_history'
        ) THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'ia_%'
ORDER BY table_name;

-- 2. Contagem de registros em cada tabela
SELECT 
    'ia_categories' as tabela,
    COUNT(*) as total_registros
FROM ia_categories
UNION ALL
SELECT 
    'ia_knowledge_base' as tabela,
    COUNT(*) as total_registros
FROM ia_knowledge_base
UNION ALL
SELECT 
    'ia_qa' as tabela,
    COUNT(*) as total_registros
FROM ia_qa
UNION ALL
SELECT 
    'ia_documents' as tabela,
    COUNT(*) as total_registros
FROM ia_documents
UNION ALL
SELECT 
    'ia_conversations' as tabela,
    COUNT(*) as total_registros
FROM ia_conversations
UNION ALL
SELECT 
    'ia_learning' as tabela,
    COUNT(*) as total_registros
FROM ia_learning
UNION ALL
SELECT 
    'ia_mentorias' as tabela,
    COUNT(*) as total_registros
FROM ia_mentorias
UNION ALL
SELECT 
    'ia_web_search_config' as tabela,
    COUNT(*) as total_registros
FROM ia_web_search_config;

-- 3. Verificar configuração do Tavily
SELECT 
    id,
    is_enabled,
    api_provider,
    CASE 
        WHEN api_key IS NULL THEN '❌ Não configurado'
        WHEN LENGTH(api_key) > 0 THEN '✅ Configurado (' || LEFT(api_key, 15) || '...)'
        ELSE '❌ Vazio'
    END as api_key_status,
    max_results,
    updated_at
FROM ia_web_search_config
ORDER BY id DESC
LIMIT 1;

-- 4. Verificar aprendizado pendente
SELECT 
    id,
    LEFT(question, 50) as pergunta,
    LEFT(suggested_answer, 50) as resposta_sugerida,
    status,
    created_at
FROM ia_learning
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar conhecimento aprendido do Tavily
SELECT 
    id,
    title,
    source_type,
    created_at
FROM ia_knowledge_base
WHERE source_type IN ('tavily_learned', 'tavily_training', 'tavily_book')
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verificar índices criados
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE tablename LIKE 'ia_%'
ORDER BY tablename, indexname;

-- 7. RESUMO FINAL
SELECT 
    'RESUMO DA VERIFICAÇÃO' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_knowledge_base')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_qa')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_web_search_config')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_learning')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ia_mentorias')
        THEN '✅ TODAS AS TABELAS PRINCIPAIS EXISTEM!'
        ELSE '❌ ALGUMAS TABELAS ESTÃO FALTANDO'
    END as status;

