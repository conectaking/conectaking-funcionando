-- ===========================================
-- VERIFICAR: Quais tabelas foram criadas?
-- Execute esta query para ver o que existe
-- ===========================================

SELECT 
    'Tabelas que EXISTEM:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

-- Se aparecer menos de 3 linhas, algumas tabelas não foram criadas
-- Execute apenas os comandos CREATE TABLE que faltaram

