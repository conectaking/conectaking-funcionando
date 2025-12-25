-- ===========================================
-- QUERIES DE VERIFICAÇÃO - Catálogo de Produtos
-- Execute estas queries APÓS executar as migrations
-- ===========================================

-- 1. Verificar se o ENUM 'product_catalog' foi adicionado
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
AND enumlabel = 'product_catalog';

-- 2. Verificar se a tabela 'product_catalog_items' foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'product_catalog_items';

-- 3. Verificar estrutura completa da tabela (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'product_catalog_items'
ORDER BY ordinal_position;

-- 4. Verificar se os índices foram criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'product_catalog_items';

-- 5. Verificar se o trigger foi criado
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'product_catalog_items';

