-- Script para visualizar contas com problemas de módulos
-- Execute este script no DBeaver para ver todas as contas com problemas detalhadamente
-- Data: 2026-01-31
-- NOTA: Se houver timeout, execute as queries individuais abaixo separadamente

-- ============================================
-- RELATÓRIO COMPLETO DE CONTAS COM PROBLEMAS
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
),
problemas AS (
    -- Problema 1: subscription_id inativo
    SELECT 
        'subscription_id INATIVO'::text AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        sp.plan_code AS plan_code_subscription,
        sp.plan_name AS plan_name_subscription,
        sp.is_active AS subscription_is_active,
        up.plan_code_resolvido,
        COALESCE(COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true), 0) AS total_modulos
    FROM users u
    INNER JOIN subscription_plans sp ON (
        CASE 
            WHEN u.subscription_id IS NOT NULL AND u.subscription_id ~ '^[0-9]+$' 
            THEN CAST(u.subscription_id AS INTEGER) 
            ELSE NULL 
        END
    ) = sp.id
    LEFT JOIN user_plans up ON u.id = up.user_id
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
    WHERE u.subscription_id IS NOT NULL
      AND u.subscription_id ~ '^[0-9]+$'
      AND sp.is_active = false
      AND up.plan_code_resolvido IS NOT NULL
    GROUP BY u.id, u.email, u.account_type, u.subscription_id, sp.plan_code, sp.plan_name, sp.is_active, up.plan_code_resolvido
    
    UNION ALL
    
    -- Problema 2: subscription_id inexistente
    SELECT 
        'subscription_id INEXISTENTE'::text AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        NULL::text AS plan_code_subscription,
        NULL::text AS plan_name_subscription,
        NULL::boolean AS subscription_is_active,
        up.plan_code_resolvido,
        COALESCE(COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true), 0) AS total_modulos
    FROM users u
    LEFT JOIN user_plans up ON u.id = up.user_id
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
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
    GROUP BY u.id, u.email, u.account_type, u.subscription_id, up.plan_code_resolvido
    
    UNION ALL
    
    -- Problema 3: sem módulos
    SELECT 
        'SEM MÓDULOS'::text AS problema,
        up.user_id,
        up.email,
        up.account_type,
        up.subscription_id,
        sp.plan_code AS plan_code_subscription,
        sp.plan_name AS plan_name_subscription,
        sp.is_active AS subscription_is_active,
        up.plan_code_resolvido,
        COALESCE(COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true), 0) AS total_modulos
    FROM user_plans up
    LEFT JOIN subscription_plans sp ON (
        CASE 
            WHEN up.subscription_id IS NOT NULL AND up.subscription_id ~ '^[0-9]+$' 
            THEN CAST(up.subscription_id AS INTEGER) 
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
        'SEM PLANO DEFINIDO'::text AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        NULL::text AS plan_code_subscription,
        NULL::text AS plan_name_subscription,
        NULL::boolean AS subscription_is_active,
        NULL::text AS plan_code_resolvido,
        NULL::integer AS total_modulos
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
            'VERIFICAR: O plan_code ' || COALESCE(plan_code_resolvido::text, 'NULL') || ' existe em module_plan_availability? Tem módulos com is_available=true?'
        WHEN problema = 'SEM PLANO DEFINIDO' THEN 
            'DEFINIR: Atualizar account_type para um valor válido (ex: basic, premium) OU associar a um subscription_id válido'
        ELSE 'Verificar manualmente'
    END AS solucao_sugerida
FROM problemas
ORDER BY problema, email;
