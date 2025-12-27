-- Verificar constraints da tabela profile_items relacionadas a item_type
SELECT 
    conname AS "Nome da Constraint",
    pg_get_constraintdef(oid) AS "Definição"
FROM pg_constraint
WHERE conrelid = 'profile_items'::regclass
AND conname LIKE '%item_type%';

-- Verificar a constraint específica que está causando o erro
SELECT 
    conname AS "Nome da Constraint",
    pg_get_constraintdef(oid) AS "Definição Completa"
FROM pg_constraint
WHERE conrelid = 'profile_items'::regclass
AND conname = 'profile_items_item_type_check';

