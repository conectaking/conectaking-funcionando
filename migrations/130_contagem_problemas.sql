-- Script para ver contagem de problemas por tipo
-- Execute este script no DBeaver para ver quantas contas têm cada tipo de problema
-- Data: 2026-01-31

-- ============================================
-- CONTAGEM POR TIPO DE PROBLEMA
-- ============================================
WITH user_plans AS (
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
),
problemas AS (
    SELECT 'subscription_id INATIVO' AS problema 
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
    SELECT 'subscription_id INEXISTENTE' 
    FROM users u 
    WHERE u.subscription_id IS NOT NULL 
      AND u.subscription_id ~ '^[0-9]+$' 
      AND NOT EXISTS (
          SELECT 1 FROM subscription_plans sp 
          WHERE sp.id = (
              CASE 
                  WHEN u.subscription_id ~ '^[0-9]+$' 
                  THEN CAST(u.subscription_id AS INTEGER) 
                  ELSE NULL 
              END
          )
      )
    UNION ALL
    SELECT 'SEM MÓDULOS' 
    FROM user_plans up 
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code 
    WHERE up.plan_code_resolvido IS NOT NULL 
    GROUP BY up.user_id 
    HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
    UNION ALL
    SELECT 'SEM PLANO DEFINIDO' 
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
)
SELECT 
    problema,
    COUNT(*) AS total_contas_afetadas
FROM problemas
GROUP BY problema
ORDER BY total_contas_afetadas DESC;
