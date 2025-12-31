-- Migration: Diagnosticar e Corrigir Problemas com Livros
-- Data: 2025-01-31
-- Descrição: Verificar por que livros não têm conteúdo e fornecer soluções

-- ============================================
-- PARTE 1: DIAGNÓSTICO COMPLETO
-- ============================================

-- 1. Verificar todos os livros e seu conteúdo
SELECT 
    '📚 DIAGNÓSTICO DE LIVROS' as tipo,
    COUNT(*) as total_livros,
    COUNT(CASE WHEN LENGTH(content) > 1000 THEN 1 END) as livros_com_conteudo_completo,
    COUNT(CASE WHEN LENGTH(content) > 0 AND LENGTH(content) <= 1000 THEN 1 END) as livros_com_conteudo_curto,
    COUNT(CASE WHEN LENGTH(content) = 0 OR content IS NULL THEN 1 END) as livros_sem_conteudo,
    SUM(LENGTH(content)) as total_caracteres,
    AVG(LENGTH(content)) as media_caracteres
FROM ia_knowledge_base
WHERE source_type IN ('book_training', 'tavily_book', 'tavily_book_trained');

-- 2. Listar livros sem conteúdo ou com conteúdo muito curto
SELECT 
    id,
    title,
    LENGTH(content) as content_length,
    source_type,
    is_active,
    usage_count,
    created_at,
    CASE 
        WHEN LENGTH(content) = 0 OR content IS NULL THEN '❌ SEM CONTEÚDO'
        WHEN LENGTH(content) < 500 THEN '⚠️ CONTEÚDO MUITO CURTO'
        WHEN LENGTH(content) < 2000 THEN '⚠️ CONTEÚDO INCOMPLETO'
        ELSE '✅ TEM CONTEÚDO'
    END as status
FROM ia_knowledge_base
WHERE source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
ORDER BY LENGTH(content) ASC, created_at DESC;

-- 3. Verificar seções de cada livro
SELECT 
    kb.id as livro_id,
    kb.title as livro_titulo,
    LENGTH(kb.content) as livro_content_length,
    COUNT(sections.id) as total_secoes,
    SUM(LENGTH(sections.content)) as total_chars_secoes,
    (LENGTH(kb.content) + COALESCE(SUM(LENGTH(sections.content)), 0)) as total_conteudo
FROM ia_knowledge_base kb
LEFT JOIN ia_knowledge_base sections ON (
    sections.source_type = 'book_training'
    AND (
        sections.source_reference LIKE '%' || kb.source_reference || '%'
        OR sections.source_reference LIKE 'book_' || REPLACE(kb.title, ' ', '_') || '_section_%'
        OR sections.title LIKE '%' || kb.title || '%'
    )
    AND sections.content IS NOT NULL
    AND sections.content != ''
)
WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
GROUP BY kb.id, kb.title, kb.content, kb.source_reference
ORDER BY total_conteudo ASC;

-- 4. Verificar se livros estão sendo usados
SELECT 
    kb.id,
    kb.title,
    kb.usage_count,
    MAX(ic.created_at) as last_used,
    CASE 
        WHEN kb.usage_count = 0 AND MAX(ic.created_at) IS NULL THEN '❌ NUNCA USADO'
        WHEN kb.usage_count > 0 THEN '✅ USADO ' || kb.usage_count || ' VEZ(ES)'
        ELSE '⚠️ USADO MAS usage_count = 0'
    END as status_uso
FROM ia_knowledge_base kb
LEFT JOIN ia_conversations ic ON kb.id = ANY(ic.knowledge_used)
WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
GROUP BY kb.id, kb.title, kb.usage_count
ORDER BY last_used DESC NULLS LAST, kb.usage_count DESC;

-- ============================================
-- PARTE 2: VERIFICAR SEÇÕES DE UM LIVRO ESPECÍFICO
-- ============================================

-- Substitua 'NOME_DO_LIVRO' pelo título do livro que você quer verificar
-- Exemplo: Para "Pablo Marçal", use: '%Pablo Marçal%'

/*
SELECT 
    id,
    title,
    LENGTH(content) as content_length,
    source_type,
    source_reference,
    created_at
FROM ia_knowledge_base
WHERE source_type = 'book_training'
AND (
    source_reference LIKE '%NOME_DO_LIVRO%'
    OR title LIKE '%NOME_DO_LIVRO%'
    OR source_reference LIKE 'book_%NOME_DO_LIVRO%_section_%'
)
ORDER BY id ASC;
*/

-- ============================================
-- PARTE 3: RECOMENDAÇÕES BASEADAS NO DIAGNÓSTICO
-- ============================================

-- Esta query mostra o que precisa ser feito para cada livro
SELECT 
    kb.id,
    kb.title,
    LENGTH(kb.content) as livro_content_length,
    COUNT(sections.id) as secoes_encontradas,
    SUM(LENGTH(sections.content)) as secoes_content_length,
    CASE 
        WHEN LENGTH(kb.content) = 0 AND COUNT(sections.id) = 0 THEN 
            '❌ RETREINAR: Livro sem conteúdo principal e sem seções'
        WHEN LENGTH(kb.content) = 0 AND COUNT(sections.id) > 0 THEN 
            '⚠️ CORRIGIR: Livro sem conteúdo principal, mas tem ' || COUNT(sections.id) || ' seções'
        WHEN LENGTH(kb.content) < 500 AND COUNT(sections.id) = 0 THEN 
            '⚠️ RETREINAR: Conteúdo muito curto (' || LENGTH(kb.content) || ' chars)'
        WHEN LENGTH(kb.content) < 500 AND COUNT(sections.id) > 0 THEN 
            '✅ OK: Tem ' || COUNT(sections.id) || ' seções (conteúdo principal curto)'
        WHEN LENGTH(kb.content) >= 500 AND COUNT(sections.id) > 0 THEN 
            '✅ COMPLETO: Tem conteúdo principal e ' || COUNT(sections.id) || ' seções'
        ELSE 
            '✅ OK: Tem conteúdo principal (' || LENGTH(kb.content) || ' chars)'
    END as acao_necessaria
FROM ia_knowledge_base kb
LEFT JOIN ia_knowledge_base sections ON (
    sections.source_type = 'book_training'
    AND sections.id != kb.id
    AND (
        sections.source_reference LIKE '%' || COALESCE(kb.source_reference, '') || '%'
        OR sections.source_reference LIKE 'book_' || REPLACE(COALESCE(kb.title, ''), ' ', '_') || '_section_%'
        OR sections.title LIKE '%' || COALESCE(kb.title, '') || '%'
    )
    AND sections.content IS NOT NULL
    AND sections.content != ''
)
WHERE kb.source_type IN ('book_training', 'tavily_book', 'tavily_book_trained')
GROUP BY kb.id, kb.title, kb.content
ORDER BY 
    CASE 
        WHEN LENGTH(kb.content) = 0 AND COUNT(sections.id) = 0 THEN 1
        WHEN LENGTH(kb.content) < 500 THEN 2
        ELSE 3
    END,
    kb.created_at DESC;

-- ============================================
-- PARTE 4: ESTATÍSTICAS GERAIS
-- ============================================

SELECT 
    '📊 ESTATÍSTICAS GERAIS' as tipo,
    COUNT(*) as total_livros,
    COUNT(CASE WHEN is_active = true THEN 1 END) as livros_ativos,
    COUNT(CASE WHEN is_active = false THEN 1 END) as livros_inativos,
    COUNT(CASE WHEN usage_count > 0 THEN 1 END) as livros_usados,
    COUNT(CASE WHEN usage_count = 0 THEN 1 END) as livros_nunca_usados,
    SUM(usage_count) as total_usos,
    AVG(usage_count) as media_usos_por_livro
FROM ia_knowledge_base
WHERE source_type IN ('book_training', 'tavily_book', 'tavily_book_trained');

-- ============================================
-- PARTE 5: VERIFICAR CONTEÚDO DE UM LIVRO ESPECÍFICO
-- ============================================

-- Para ver o conteúdo de um livro específico, substitua o ID
/*
SELECT 
    id,
    title,
    LEFT(content, 500) as content_preview,
    LENGTH(content) as content_length,
    source_type,
    source_reference
FROM ia_knowledge_base
WHERE id = [ID_DO_LIVRO];
*/

