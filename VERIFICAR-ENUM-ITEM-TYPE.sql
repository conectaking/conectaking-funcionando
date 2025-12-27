-- Verificar valores do enum item_type_enum
SELECT enumlabel as "Valores do Enum"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

