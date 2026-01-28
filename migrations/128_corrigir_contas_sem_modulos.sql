-- Migration: Corrigir contas sem módulos e sem plano definido
-- Descrição: Corrige automaticamente as contas identificadas pelo script de diagnóstico
-- Data: 2026-01-31
--
-- IMPORTANTE: Este script FAZ ALTERAÇÕES no banco de dados (UPDATE).
-- Execute apenas após revisar quais contas serão afetadas.
-- Faça backup antes de executar!

-- ============================================
-- 1. PREVIEW: Ver quais contas serão corrigidas
-- ============================================
-- Execute esta consulta primeiro para ver o que será alterado:

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
            WHEN u.account_type::text IN ('individual', 'basic', 'king_start') THEN 'basic'
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
    -- Contas sem módulos
    SELECT 
        'SEM MÓDULOS' AS problema,
        up.user_id,
        up.email,
        up.account_type,
        up.subscription_id,
        up.plan_code_resolvido,
        'Atualizar account_type para basic (King Start)' AS acao_sugerida
    FROM user_plans up
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
    WHERE up.plan_code_resolvido IS NOT NULL
    GROUP BY up.user_id, up.email, up.account_type, up.subscription_id, up.plan_code_resolvido
    HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
    
    UNION ALL
    
    -- Contas sem plano definido
    SELECT 
        'SEM PLANO DEFINIDO' AS problema,
        u.id AS user_id,
        u.email,
        u.account_type,
        u.subscription_id,
        'basic' AS plan_code_resolvido,
        'Definir account_type = basic (King Start)' AS acao_sugerida
    FROM users u
    WHERE u.subscription_id IS NULL
      AND (u.account_type IS NULL OR u.account_type::text NOT IN ('individual', 'individual_com_logo', 'basic', 'premium', 'king_start', 'king_prime', 'king_base', 'king_essential', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'business_owner', 'enterprise', 'free', 'adm_principal', 'abm'))
)
SELECT 
    problema,
    user_id,
    email,
    account_type AS account_type_atual,
    subscription_id,
    plan_code_resolvido AS plan_code_sugerido,
    acao_sugerida
FROM problemas
ORDER BY problema, email;

-- ============================================
-- 2. CORREÇÃO: Contas SEM PLANO DEFINIDO
-- ============================================
-- Define account_type = 'basic' para contas sem subscription_id e sem account_type válido
-- COMENTE AS LINHAS ABAIXO PARA EXECUTAR:

/*
UPDATE users 
SET account_type = 'basic'::account_type_enum,
    updated_at = NOW()
WHERE subscription_id IS NULL
  AND (account_type IS NULL OR account_type::text NOT IN (
      'individual', 'individual_com_logo', 'basic', 'premium',
      'king_start', 'king_prime', 'king_base', 'king_essential',
      'king_finance', 'king_finance_plus', 'king_premium_plus',
      'king_corporate', 'business_owner', 'enterprise',
      'free', 'adm_principal', 'abm'
  ));

-- Verificar quantas contas foram corrigidas
SELECT COUNT(*) AS contas_corrigidas_sem_plano
FROM users 
WHERE subscription_id IS NULL
  AND account_type = 'basic'::account_type_enum;
*/

-- ============================================
-- 3. CORREÇÃO: Contas SEM MÓDULOS (plan_code não tem módulos)
-- ============================================
-- Para contas cujo plan_code resolvido não retorna módulos, atualizar account_type para 'basic'
-- COMENTE AS LINHAS ABAIXO PARA EXECUTAR:

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
            WHEN u.account_type::text IN ('individual', 'basic', 'king_start') THEN 'basic'
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
contas_sem_modulos AS (
    SELECT up.user_id
    FROM user_plans up
    LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
    WHERE up.plan_code_resolvido IS NOT NULL
    GROUP BY up.user_id, up.plan_code_resolvido
    HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
)
UPDATE users u
SET account_type = 'basic'::account_type_enum,
    updated_at = NOW()
FROM contas_sem_modulos csm
WHERE u.id = csm.user_id
  AND u.subscription_id IS NULL;  -- Só atualizar se não tiver subscription_id (para não sobrescrever plano da assinatura)

-- Verificar quantas contas foram corrigidas
SELECT COUNT(*) AS contas_corrigidas_sem_modulos
FROM user_plans up
LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code
WHERE up.plan_code_resolvido IS NOT NULL
GROUP BY up.user_id
HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0;
*/

-- ============================================
-- 4. VERIFICAÇÃO FINAL: Contar problemas restantes
-- ============================================
-- Execute após as correções para verificar se ainda há problemas:

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
            WHEN u.account_type::text IN ('individual', 'basic', 'king_start') THEN 'basic'
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
    SELECT 'SEM MÓDULOS' AS problema FROM user_plans up LEFT JOIN module_plan_availability mpa ON up.plan_code_resolvido = mpa.plan_code WHERE up.plan_code_resolvido IS NOT NULL GROUP BY up.user_id HAVING COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) = 0
    UNION ALL
    SELECT 'SEM PLANO DEFINIDO' FROM users u WHERE u.subscription_id IS NULL AND (u.account_type IS NULL OR u.account_type::text NOT IN ('individual', 'individual_com_logo', 'basic', 'premium', 'king_start', 'king_prime', 'king_base', 'king_essential', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate', 'business_owner', 'enterprise', 'free', 'adm_principal', 'abm'))
)
SELECT 
    problema,
    COUNT(*) AS total_contas_afetadas
FROM problemas
GROUP BY problema
ORDER BY total_contas_afetadas DESC;
