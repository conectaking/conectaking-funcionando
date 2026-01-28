-- Migration: Diagnosticar contas com problemas de módulos
-- Descrição: Identifica contas que não estão recebendo módulos corretamente:
--            1) subscription_id aponta para plano inativo
--            2) subscription_id aponta para plano inexistente
--            3) plan_code resolvido não tem módulos na module_plan_availability
--            4) Contas sem subscription_id e sem account_type válido
-- Data: 2026-01-31

-- ============================================
-- 1. CONTAS COM subscription_id INATIVO
-- ============================================
-- Comentado: Execute individualmente se necessário
/*
SELECT 
    'subscription_id INATIVO' AS problema,
    u.id AS user_id,
    u.email,
    u.account_type,
    u.subscription_id,
    sp.plan_code AS plan_code_subscription,
    sp.plan_name AS plan_name_subscription,
    sp.is_active AS subscription_is_active,
    NULL AS plan_code_resolvido,
    NULL AS total_modulos
FROM users u
    INNER JOIN subscription_plans sp ON (
        CASE 
            WHEN u.subscription_id ~ '^[0-9]+$' THEN CAST(u.subscription_id AS INTEGER)
            ELSE NULL
        END
    ) = sp.id
    WHERE u.subscription_id IS NOT NULL
      AND u.subscription_id ~ '^[0-9]+$'  -- Apenas valores numéricos
      AND sp.is_active = false
ORDER BY u.email;

-- ============================================
-- 2. CONTAS COM subscription_id INEXISTENTE
-- ============================================
SELECT 
    'subscription_id INEXISTENTE' AS problema,
    u.id AS user_id,
    u.email,
    u.account_type,
    u.subscription_id,
    NULL AS plan_code_subscription,
    NULL AS plan_name_subscription,
    NULL AS subscription_is_active,
    NULL AS plan_code_resolvido,
    NULL AS total_modulos
FROM users u
WHERE u.subscription_id IS NOT NULL
  AND u.subscription_id ~ '^[0-9]+$'  -- Apenas valores numéricos
  AND NOT EXISTS (
      SELECT 1 FROM subscription_plans sp 
      WHERE sp.id = CASE 
          WHEN u.subscription_id ~ '^[0-9]+$' THEN CAST(u.subscription_id AS INTEGER)
          ELSE NULL
      END
  )
ORDER BY u.email;
*/

-- ============================================
-- 3. CONTAS SEM MÓDULOS (plan_code não retorna módulos)
-- ============================================
-- Comentado: Execute individualmente se necessário
/*
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
)
SELECT 
    'SEM MÓDULOS' AS problema,
    up.user_id,
    up.email,
    up.account_type,
    up.subscription_id,
    sp.plan_code AS plan_code_subscription,
    sp.plan_name AS plan_name_subscription,
    sp.is_active AS subscription_is_active,
    up.plan_code_resolvido,
    COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) AS total_modulos
FROM user_plans up
LEFT JOIN subscription_plans sp ON (
    CASE 
        WHEN up.subscription_id ~ '^[0-9]+$' THEN CAST(up.subscription_id AS INTEGER)
        ELSE NULL
    END
) = sp.id
LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
WHERE up.plan_code_resolvido IS NOT NULL
GROUP BY 
    up.user_id, up.email, up.account_type, up.subscription_id,
    sp.plan_code, sp.plan_name, sp.is_active, up.plan_code_resolvido
HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
ORDER BY up.email;
*/

-- ============================================
-- 4. CONTAS SEM subscription_id E SEM account_type VÁLIDO
-- ============================================
-- Comentado: Execute individualmente se necessário
/*
SELECT 
    'SEM PLANO DEFINIDO' AS problema,
    u.id AS user_id,
    u.email,
    u.account_type,
    u.subscription_id,
    NULL AS plan_code_subscription,
    NULL AS plan_name_subscription,
    NULL AS subscription_is_active,
    NULL AS plan_code_resolvido,
    NULL AS total_modulos
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
ORDER BY u.email;
*/

-- ============================================
-- 5. RELATÓRIO COMPLETO (TODOS OS PROBLEMAS)
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
    -- Problema 1: subscription_id inativo
    SELECT 
        'subscription_id INATIVO' AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        sp.plan_code AS plan_code_subscription,
        sp.plan_name AS plan_name_subscription,
        sp.is_active AS subscription_is_active,
        up.plan_code_resolvido,
        COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) AS total_modulos
    FROM users u
    INNER JOIN subscription_plans sp ON (
        CASE 
            WHEN u.subscription_id ~ '^[0-9]+$' THEN CAST(u.subscription_id AS INTEGER)
            ELSE NULL
        END
    ) = sp.id
    LEFT JOIN user_plans up ON u.id = up.user_id
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
    WHERE u.subscription_id IS NOT NULL
      AND u.subscription_id ~ '^[0-9]+$'  -- Apenas valores numéricos
      AND sp.is_active = false
      AND up.plan_code_resolvido IS NOT NULL
    GROUP BY u.id, u.email, u.account_type, u.subscription_id, sp.plan_code, sp.plan_name, sp.is_active, up.plan_code_resolvido
    
    UNION ALL
    
    -- Problema 2: subscription_id inexistente
    SELECT 
        'subscription_id INEXISTENTE' AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        NULL AS plan_code_subscription,
        NULL AS plan_name_subscription,
        NULL AS subscription_is_active,
        up.plan_code_resolvido,
        COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) AS total_modulos
    FROM users u
    LEFT JOIN user_plans up ON u.id = up.user_id
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
    WHERE u.subscription_id IS NOT NULL
      AND u.subscription_id ~ '^[0-9]+$'  -- Apenas valores numéricos
      AND NOT EXISTS (
          SELECT 1 FROM subscription_plans sp 
          WHERE sp.id = CASE 
              WHEN u.subscription_id ~ '^[0-9]+$' THEN CAST(u.subscription_id AS INTEGER)
              ELSE NULL
          END
      )
    GROUP BY u.id, u.email, u.account_type, u.subscription_id, up.plan_code_resolvido
    
    UNION ALL
    
    -- Problema 3: sem módulos
    SELECT 
        'SEM MÓDULOS' AS problema,
        up.user_id,
        up.email,
        up.account_type,
        up.subscription_id,
        sp.plan_code AS plan_code_subscription,
        sp.plan_name AS plan_name_subscription,
        sp.is_active AS subscription_is_active,
        up.plan_code_resolvido,
        COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) AS total_modulos
    FROM user_plans up
    LEFT JOIN subscription_plans sp ON (
        CASE 
            WHEN up.subscription_id ~ '^[0-9]+$' THEN CAST(up.subscription_id AS INTEGER)
            ELSE NULL
        END
    ) = sp.id
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
    WHERE up.plan_code_resolvido IS NOT NULL
    GROUP BY up.user_id, up.email, up.account_type, up.subscription_id, sp.plan_code, sp.plan_name, sp.is_active, up.plan_code_resolvido
    HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
    
    UNION ALL
    
    -- Problema 4: sem plano definido
    SELECT 
        'SEM PLANO DEFINIDO' AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        NULL AS plan_code_subscription,
        NULL AS plan_name_subscription,
        NULL AS subscription_is_active,
        NULL AS plan_code_resolvido,
        NULL AS total_modulos
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
    user_id,
    email,
    account_type,
    subscription_id,
    plan_code_subscription,
    plan_name_subscription,
    subscription_is_active,
    plan_code_resolvido,
    total_modulos,
    CASE 
        WHEN problema = 'subscription_id INATIVO' THEN 
            'ATUALIZAR: Definir subscription_id para um plano ativo OU atualizar account_type para um valor válido'
        WHEN problema = 'subscription_id INEXISTENTE' THEN 
            'CORRIGIR: Limpar subscription_id (SET subscription_id = NULL) OU atualizar para um plano válido'
        WHEN problema = 'SEM MÓDULOS' THEN 
            'VERIFICAR: O plan_code ' || COALESCE(plan_code_resolvido, 'NULL') || ' existe em module_plan_availability? Tem módulos com is_available=true?'
        WHEN problema = 'SEM PLANO DEFINIDO' THEN 
            'DEFINIR: Atualizar account_type para um valor válido (ex: basic, premium) OU associar a um subscription_id válido'
    END AS solucao_sugerida
FROM problemas
ORDER BY problema, email;

-- ============================================
-- 6. CONTAGEM POR TIPO DE PROBLEMA
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
    SELECT 'subscription_id INATIVO' AS problema FROM users u INNER JOIN subscription_plans sp ON (CASE WHEN u.subscription_id ~ '^[0-9]+$' THEN CAST(u.subscription_id AS INTEGER) ELSE NULL END) = sp.id WHERE u.subscription_id IS NOT NULL AND u.subscription_id ~ '^[0-9]+$' AND sp.is_active = false
    UNION ALL
    SELECT 'subscription_id INEXISTENTE' FROM users u WHERE u.subscription_id IS NOT NULL AND u.subscription_id ~ '^[0-9]+$' AND NOT EXISTS (SELECT 1 FROM subscription_plans sp WHERE sp.id = CASE WHEN u.subscription_id ~ '^[0-9]+$' THEN CAST(u.subscription_id AS INTEGER) ELSE NULL END)
    UNION ALL
    SELECT 'SEM MÓDULOS' FROM user_plans up LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code WHERE up.plan_code_resolvido IS NOT NULL GROUP BY up.user_id HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
    UNION ALL
    SELECT 'SEM PLANO DEFINIDO' FROM users u WHERE u.subscription_id IS NULL AND (u.account_type IS NULL OR u.account_type::text NOT IN ('individual', 'individual_com_logo', 'basic', 'premium', 'king_start', 'king_prime', 'king_base', 'king_essential', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'business_owner', 'enterprise', 'free', 'adm_principal', 'abm', 'team_member'))
)
SELECT 
    problema,
    COUNT(*) AS total_contas_afetadas
FROM problemas
GROUP BY problema
ORDER BY total_contas_afetadas DESC;
