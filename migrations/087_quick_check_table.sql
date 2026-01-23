-- ===========================================
-- Verificação Rápida: Tabela unique_form_links
-- Data: 2026-01-16
-- Descrição: Query simples para verificar rapidamente se a tabela existe
-- ===========================================

-- Query única para verificar se a tabela existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
        ) THEN '✅ TABELA EXISTE'
        ELSE '❌ TABELA NÃO EXISTE - Execute a migration 084'
    END as status_tabela,
    
    -- Se existir, mostrar estrutura
    (SELECT string_agg(
        column_name || ' (' || data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
        END || ')',
        ', ' ORDER BY ordinal_position
    )
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'unique_form_links') as colunas;

-- Se a tabela existir, mostrar alguns detalhes
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'unique_form_links'
ORDER BY ordinal_position;
