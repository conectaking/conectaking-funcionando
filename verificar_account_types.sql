-- Verificação: account_type_enum e distribuição de usuários
-- Execute no cliente SQL (DBeaver, pgAdmin, etc.) para conferir o resultado

-- 1) Valores atuais do enum account_type_enum
SELECT '=== Valores no account_type_enum ===' AS info;
SELECT enumlabel AS valor_enum
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
ORDER BY enumsortorder;

-- 2) Contagem de usuários por account_type
SELECT '=== Usuários por account_type ===' AS info;
SELECT 
    account_type,
    COUNT(*) AS total
FROM users
GROUP BY account_type
ORDER BY account_type;

-- 3) Verificar se ainda há planos antigos (individual, individual_com_logo, business_owner)
--    Se retornar linhas, o script atualizar_planos_usuarios.sql ainda não foi executado
SELECT '=== Planos antigos ainda presentes? (vazio = OK) ===' AS info;
SELECT account_type, COUNT(*) AS total
FROM users
WHERE account_type IN ('individual', 'individual_com_logo', 'business_owner')
GROUP BY account_type;
