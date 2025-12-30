-- Script para verificar se as tabelas da IA KING foram criadas corretamente
-- Execute este script no DBeaver para verificar o status das migrations

-- 1. Verificar se as tabelas existem
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
            'ia_statistics'
        ) THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'ia_%'
ORDER BY table_name;

-- 2. Verificar estrutura da tabela ia_categories
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_categories'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela ia_knowledge_base
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_knowledge_base'
ORDER BY ordinal_position;

-- 4. Verificar estrutura da tabela ia_qa
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_qa'
ORDER BY ordinal_position;

-- 5. Verificar estrutura da tabela ia_documents
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_documents'
ORDER BY ordinal_position;

-- 6. Verificar estrutura da tabela ia_conversations
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_conversations'
ORDER BY ordinal_position;

-- 7. Verificar estrutura da tabela ia_learning
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_learning'
ORDER BY ordinal_position;

-- 8. Verificar estrutura da tabela ia_statistics
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_statistics'
ORDER BY ordinal_position;

-- 9. Verificar dados iniciais em ia_categories
SELECT COUNT(*) as total_categorias FROM ia_categories;

-- 10. Verificar dados iniciais em ia_knowledge_base
SELECT COUNT(*) as total_conhecimento FROM ia_knowledge_base;

-- 11. Verificar foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name LIKE 'ia_%';

-- 12. Verificar se há erros nas constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint
WHERE conrelid::regclass::text LIKE 'ia_%'
ORDER BY conrelid::regclass, conname;

