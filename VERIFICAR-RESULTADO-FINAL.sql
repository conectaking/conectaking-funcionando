-- ===========================================
-- VERIFICAÇÃO FINAL - Execute esta query
-- ===========================================

-- Verificar se as 3 tabelas foram criadas
SELECT 
    'Tabelas criadas:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

-- Se aparecerem 3 linhas = SUCESSO! ✅
-- Se continuar vazio = Execute novamente a migration ❌

