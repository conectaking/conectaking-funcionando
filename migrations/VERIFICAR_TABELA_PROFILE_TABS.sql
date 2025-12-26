-- Execute esta query para verificar se a tabela profile_tabs foi criada

-- Verificar se a tabela existe
SELECT 
    table_name,
    'Tabela existe!' as status
FROM information_schema.tables 
WHERE table_name = 'profile_tabs';

-- Verificar as colunas da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profile_tabs'
ORDER BY ordinal_position;

-- Verificar se o trigger foi criado
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profile_tabs';

