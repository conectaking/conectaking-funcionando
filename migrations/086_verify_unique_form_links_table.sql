-- ===========================================
-- Script de Verificação: Verificar existência da tabela unique_form_links
-- Data: 2026-01-16
-- Descrição: Diagnóstico para verificar se a tabela foi criada corretamente
-- ===========================================

-- Verificação 1: Verificar se a tabela existe
SELECT 
    'Tabela existe?' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
        ) THEN 'SIM ✅'
        ELSE 'NÃO ❌'
    END as resultado;

-- Verificação 2: Listar todas as colunas da tabela (se existir)
SELECT 
    'Colunas da tabela' as verificacao,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'unique_form_links'
ORDER BY ordinal_position;

-- Verificação 3: Contar registros na tabela (se existir)
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'unique_form_links'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO record_count FROM unique_form_links;
        RAISE NOTICE 'Total de registros na tabela: %', record_count;
    ELSE
        RAISE NOTICE 'Tabela unique_form_links não existe!';
    END IF;
END $$;

-- Verificação 4: Verificar se as funções existem
SELECT 
    'Função mark_unique_link_as_used existe?' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'mark_unique_link_as_used'
        ) THEN 'SIM ✅'
        ELSE 'NÃO ❌'
    END as resultado;

SELECT 
    'Função is_unique_link_valid existe?' as verificacao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'is_unique_link_valid'
        ) THEN 'SIM ✅'
        ELSE 'NÃO ❌'
    END as resultado;

-- Verificação 5: Listar todos os schemas disponíveis (caso a tabela esteja em outro schema)
SELECT 
    'Schemas disponíveis' as verificacao,
    schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- Verificação final
SELECT 'Diagnóstico completo! Verifique os resultados acima.' AS status;
