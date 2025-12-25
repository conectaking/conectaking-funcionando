-- Script para verificar se as colunas title e whatsapp_message existem na tabela profile_items

-- Verificar se a coluna title existe
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'title';

-- Verificar se a coluna whatsapp_message existe
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'whatsapp_message';

-- Ver todas as colunas da tabela profile_items
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profile_items'
ORDER BY ordinal_position;
