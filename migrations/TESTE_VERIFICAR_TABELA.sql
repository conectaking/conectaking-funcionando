-- ===========================================
-- SCRIPT DE TESTE - Verificar se a tabela existe
-- Execute este script ANTES de criar a tabela
-- ===========================================

-- Verificar se a tabela users existe (necessária para a foreign key)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
        THEN 'Tabela users existe ✓'
        ELSE 'ERRO: Tabela users NÃO existe!'
    END as status_users;

-- Verificar se a tabela profile_tabs já existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_tabs') 
        THEN 'Tabela profile_tabs já existe ✓'
        ELSE 'Tabela profile_tabs NÃO existe - pode criar'
    END as status_profile_tabs;

-- Listar todas as tabelas do banco
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

