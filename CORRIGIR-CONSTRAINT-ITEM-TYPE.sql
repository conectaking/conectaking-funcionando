-- ===========================================
-- CORRIGIR CONSTRAINT item_type
-- Se a constraint estiver bloqueando sales_page, precisamos atualizá-la
-- ===========================================

-- PASSO 1: Remover a constraint antiga (se existir)
ALTER TABLE profile_items DROP CONSTRAINT IF EXISTS profile_items_item_type_check;

-- PASSO 2: Criar nova constraint que aceita sales_page
-- A constraint deve validar contra o enum item_type_enum
-- Como estamos usando um ENUM, não precisamos de CHECK constraint manual
-- O PostgreSQL já valida automaticamente contra o ENUM

-- Verificar se o enum está funcionando corretamente
SELECT enumlabel as "Valores do Enum item_type_enum"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

-- Se sales_page aparecer na lista acima, está tudo certo!
-- A constraint CHECK não deve ser necessária se o tipo da coluna for o enum

