-- ===========================================
-- Script de Verificação - Migration Sales Pages
-- Execute este script APÓS executar a migration principal
-- ===========================================

-- 1. Verificar se as tabelas foram criadas
SELECT 
    'Tabelas criadas:' as verificacao,
    table_name as nome_tabela,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_colunas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

-- 2. Verificar se os ENUMs foram criados
SELECT 
    'ENUMs criados:' as verificacao,
    typname as nome_enum
FROM pg_type 
WHERE typname IN ('sales_page_status', 'product_status', 'event_type')
ORDER BY typname;

-- 3. Verificar se sales_page foi adicionado ao item_type_enum
SELECT 
    'Valores do item_type_enum:' as verificacao,
    enumlabel as valor_enum
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

-- 4. Verificar estrutura da tabela sales_pages
SELECT 
    'Estrutura sales_pages:' as verificacao,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sales_pages'
ORDER BY ordinal_position;

-- 5. Verificar índices criados
SELECT 
    'Índices criados:' as verificacao,
    tablename as tabela,
    indexname as indice
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY tablename, indexname;

-- 6. Verificar triggers criados
SELECT 
    'Triggers criados:' as verificacao,
    trigger_name as nome_trigger,
    event_object_table as tabela
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('sales_pages', 'sales_page_products')
ORDER BY event_object_table, trigger_name;

-- 7. Contar registros (deve ser 0 inicialmente)
SELECT 
    'Contagem de registros:' as verificacao,
    'sales_pages' as tabela,
    COUNT(*) as total_registros
FROM sales_pages
UNION ALL
SELECT 
    'Contagem de registros:' as verificacao,
    'sales_page_products' as tabela,
    COUNT(*) as total_registros
FROM sales_page_products
UNION ALL
SELECT 
    'Contagem de registros:' as verificacao,
    'sales_page_events' as tabela,
    COUNT(*) as total_registros
FROM sales_page_events;

