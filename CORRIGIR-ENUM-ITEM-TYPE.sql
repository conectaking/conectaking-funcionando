-- ===========================================
-- CORRIGIR: Adicionar 'sales_page' ao enum item_type_enum
-- IMPORTANTE: Execute este comando DIRETO (não dentro de DO $$)
-- ===========================================

-- Método 1: Tentar adicionar diretamente (pode falhar se já existe, mas tudo bem)
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'sales_page';

-- Se o comando acima falhar com "já existe", ignore o erro e continue
-- Se falhar com outro erro, use o método 2 abaixo:

-- ===========================================
-- Método 2: Verificar e adicionar (mais seguro)
-- Execute APENAS este bloco se o método 1 não funcionar
-- ===========================================

-- Verificar se já existe
SELECT enumlabel as "Valores Atuais do Enum"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

-- Se 'sales_page' NÃO aparecer na lista acima, execute:
-- ALTER TYPE item_type_enum ADD VALUE 'sales_page';

-- Verificar novamente após adicionar
SELECT enumlabel as "Valores do Enum (Após Correção)"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

