-- Script para ver TODOS os problemas de uma vez (UNION ALL)
-- Execute este script no DBeaver para ver todas as contas com problemas
-- Data: 2026-01-31

-- ============================================
-- TODOS OS PROBLEMAS COMBINADOS
-- ============================================
SELECT 
    'subscription_id INATIVO' AS problema,
    u.id AS user_id,
    u.email,
    u.account_type,
    u.subscription_id,
    sp.plan_code AS plan_code_subscription,
    sp.plan_name AS plan_name_subscription,
    'ATUALIZAR: Definir subscription_id para um plano ativo OU atualizar account_type' AS solucao_sugerida
FROM users u
INNER JOIN subscription_plans sp ON (
    CASE 
        WHEN u.subscription_id IS NOT NULL AND u.subscription_id ~ '^[0-9]+$' 
        THEN CAST(u.subscription_id AS INTEGER) 
        ELSE NULL 
    END
) = sp.id
WHERE u.subscription_id IS NOT NULL
  AND u.subscription_id ~ '^[0-9]+$'
  AND sp.is_active = false

UNION ALL

SELECT 
    'subscription_id INEXISTENTE' AS problema,
    u.id AS user_id,
    u.email,
    u.account_type,
    u.subscription_id,
    NULL AS plan_code_subscription,
    NULL AS plan_name_subscription,
    'CORRIGIR: Limpar subscription_id (SET subscription_id = NULL) OU atualizar para um plano válido' AS solucao_sugerida
FROM users u
WHERE u.subscription_id IS NOT NULL
  AND u.subscription_id ~ '^[0-9]+$'
  AND NOT EXISTS (
      SELECT 1 FROM subscription_plans sp 
      WHERE sp.id = CAST(u.subscription_id AS INTEGER)
  )

UNION ALL

SELECT 
    'SEM MÓDULOS' AS problema,
    up.user_id,
    up.email,
    up.account_type,
    up.subscription_id,
    up.plan_code_resolvido AS plan_code_subscription,
    NULL AS plan_name_subscription,
    'VERIFICAR: O plan_code ' || COALESCE(up.plan_code_resolvido::text, 'NULL') || ' existe em module_plan_availability? Tem módulos com is_available=true?' AS solucao_sugerida
FROM (
    SELECT 
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        CASE 
            WHEN u.subscription_id IS NOT NULL AND u.subscription_id ~ '^[0-9]+$' THEN (
                SELECT sp.plan_code 
                FROM subscription_plans sp 
                WHERE sp.id = CAST(u.subscription_id AS INTEGER) AND sp.is_active = true
                LIMIT 1
            )
            WHEN u.account_type::text IN ('individual', 'basic', 'king_start', 'team_member') THEN 'basic'
            WHEN u.account_type::text IN ('individual_com_logo', 'premium', 'king_prime') THEN 'premium'
            WHEN u.account_type::text = 'king_base' OR u.account_type::text = 'king_essential' THEN 'king_base'
            WHEN u.account_type::text = 'king_finance' THEN 'king_finance'
            WHEN u.account_type::text = 'king_finance_plus' THEN 'king_finance_plus'
            WHEN u.account_type::text = 'king_premium_plus' THEN 'king_premium_plus'
            WHEN u.account_type::text IN ('business_owner', 'enterprise', 'king_corporate') THEN 'king_corporate'
            WHEN u.account_type::text IN ('adm_principal', 'abm') THEN 'adm_principal'
            WHEN u.account_type::text = 'free' THEN 'free'
            ELSE COALESCE(u.account_type::text, 'basic')
        END AS plan_code_resolvido
    FROM users u
) up
LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
WHERE up.plan_code_resolvido IS NOT NULL
GROUP BY up.user_id, up.email, up.account_type, up.subscription_id, up.plan_code_resolvido
HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0

UNION ALL

SELECT 
    'SEM PLANO DEFINIDO' AS problema,
    u.id AS user_id,
    u.email,
    u.account_type,
    u.subscription_id,
    NULL AS plan_code_subscription,
    NULL AS plan_name_subscription,
    'DEFINIR: Atualizar account_type para um valor válido (ex: basic, premium) OU associar a um subscription_id válido' AS solucao_sugerida
FROM users u
WHERE u.subscription_id IS NULL
  AND (
      u.account_type IS NULL 
      OR u.account_type::text NOT IN (
          'individual', 'individual_com_logo', 'basic', 'premium',
          'king_start', 'king_prime', 'king_base', 'king_essential',
          'king_finance', 'king_finance_plus', 'king_premium_plus',
          'king_corporate', 'business_owner', 'enterprise',
          'free', 'adm_principal', 'abm', 'team_member'
      )
  )

ORDER BY problema, email;
