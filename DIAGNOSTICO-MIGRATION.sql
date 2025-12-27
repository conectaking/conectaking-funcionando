-- ===========================================
-- DIAGNÓSTICO: Verificar o que já existe no banco
-- Execute este script PRIMEIRO para entender o estado atual
-- ===========================================

-- 1. Verificar se os ENUMs já existem
SELECT 'ENUMs existentes:' as info;
SELECT typname as nome_enum
FROM pg_type 
WHERE typname IN ('sales_page_status', 'product_status', 'event_type')
ORDER BY typname;

-- 2. Verificar se sales_page já está no item_type_enum
SELECT 'Valores do item_type_enum:' as info;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

-- 3. Verificar se as tabelas já existem
SELECT 'Tabelas existentes:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

-- 4. Verificar permissões do usuário atual
SELECT 'Usuário atual:' as info, current_user as usuario;

-- 5. Verificar se consegue criar uma tabela de teste
SELECT 'Teste de criação:' as info;
CREATE TABLE IF NOT EXISTS teste_migration_12345 (id INTEGER);
DROP TABLE IF EXISTS teste_migration_12345;
SELECT 'OK - Permissões estão corretas' as resultado;

