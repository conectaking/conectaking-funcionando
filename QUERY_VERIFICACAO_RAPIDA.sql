-- ===========================================
-- VERIFICAÇÃO RÁPIDA - Execute esta query
-- ===========================================

-- 1. Verificar se a tabela existe
SELECT 
    'unique_form_links' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
        ) THEN 'SIM ✅ EXISTE'
        ELSE 'NÃO ❌ NÃO EXISTE - Execute migration 084'
    END as status;

-- 2. Se existir, mostrar as colunas
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'unique_form_links'
ORDER BY ordinal_position;

-- 3. Testar acesso direto à tabela
SELECT COUNT(*) as total_registros FROM unique_form_links;
