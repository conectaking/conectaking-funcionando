-- ===========================================
-- IMPORTANTE: Execute este comando SEPARADAMENTE
-- Este comando NÃO pode ser executado dentro de uma transação
-- 
-- INSTRUÇÕES:
-- 1. Abra uma NOVA aba SQL no dBeaver
-- 2. Cole APENAS este comando abaixo
-- 3. Execute (Ctrl+Enter)
-- ===========================================

ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'sales_page';

-- Verificar se foi adicionado:
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
AND enumlabel = 'sales_page';

