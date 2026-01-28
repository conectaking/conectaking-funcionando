-- Script SQL: Consultar conta específica e seus módulos
-- Uso: Substitua 'playadrian@gmail.com' pelo email da conta que você quer verificar
-- Data: 2026-01-31
--
-- IMPORTANTE: Este script funciona em qualquer cliente SQL (DBeaver, pgAdmin, etc.)
-- Para usar: Substitua 'playadrian@gmail.com' na linha 20 pelo email desejado

-- ============================================
-- CONSULTA ESPECÍFICA PARA UMA CONTA
-- ============================================
-- ALTERE O EMAIL ABAIXO (linha 20) para o email que você quer verificar
WITH user_data AS (
    SELECT 
        u.id,
        u.email,
        u.account_type,
        u.subscription_id,
        u.is_admin,
        u.created_at
    FROM users u
    WHERE u.email = 'playadrian@gmail.com'  -- ⬅️ ALTERE AQUI o email
),
subscription_info AS (
    SELECT 
        ud.*,
        sp.id AS subscription_plan_id,
        sp.plan_code AS subscription_plan_code,
        sp.plan_name AS subscription_plan_name,
        sp.price,
        sp.monthly_price,
        sp.annual_price,
        sp.is_active AS subscription_is_active
    FROM user_data ud
    LEFT JOIN subscription_plans sp ON (
        CASE 
            WHEN ud.subscription_id ~ '^[0-9]+$' THEN CAST(ud.subscription_id AS INTEGER)
            ELSE NULL
        END
    ) = sp.id
),
resolved_plan AS (
    SELECT 
        si.*,
        COALESCE(
            CASE 
                -- Prioridade 1: subscription_id ativo
                WHEN si.subscription_is_active = true THEN si.subscription_plan_code
                -- Prioridade 2: account_type mapeado
                WHEN si.account_type::text IN ('individual', 'basic', 'king_start') THEN 'basic'
                WHEN si.account_type::text IN ('individual_com_logo', 'premium', 'king_prime') THEN 'premium'
                WHEN si.account_type::text = 'king_base' OR si.account_type::text = 'king_essential' THEN 'king_base'
                WHEN si.account_type::text = 'king_finance' THEN 'king_finance'
                WHEN si.account_type::text = 'king_finance_plus' THEN 'king_finance_plus'
                WHEN si.account_type::text = 'king_premium_plus' THEN 'king_premium_plus'
                WHEN si.account_type::text IN ('business_owner', 'enterprise', 'king_corporate') THEN 'king_corporate'
                WHEN si.account_type::text IN ('adm_principal', 'abm') THEN 'adm_principal'
                WHEN si.account_type::text = 'free' THEN 'free'
                WHEN si.account_type::text IS NOT NULL THEN si.account_type::text
                ELSE NULL
            END,
            'basic'  -- Fallback final: sempre retorna 'basic' se nada funcionar
        ) AS plan_code_resolvido,
        CASE 
            WHEN si.subscription_is_active = true THEN 'subscription_id (plano ativo)'
            WHEN si.subscription_id IS NOT NULL AND si.subscription_is_active = false THEN 'subscription_id (PLANO INATIVO - usando account_type)'
            WHEN si.subscription_id IS NOT NULL AND si.subscription_plan_code IS NULL THEN 'subscription_id (PLANO NÃO EXISTE - usando account_type)'
            WHEN si.account_type IS NOT NULL THEN 'account_type mapeado'
            ELSE 'fallback (basic)'
        END AS plan_source
    FROM subscription_info si
),
modules_info AS (
    SELECT 
        rp.*,
        COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = true) AS total_modulos_disponiveis,
        COUNT(mpa.module_type) FILTER (WHERE mpa.is_available = false) AS total_modulos_indisponiveis,
        ARRAY_AGG(mpa.module_type ORDER BY mpa.module_type) FILTER (WHERE mpa.is_available = true) AS modulos_disponiveis,
        ARRAY_AGG(mpa.module_type ORDER BY mpa.module_type) FILTER (WHERE mpa.is_available = false) AS modulos_indisponiveis
    FROM resolved_plan rp
    LEFT JOIN module_plan_availability mpa ON rp.plan_code_resolvido = mpa.plan_code
    GROUP BY rp.id, rp.email, rp.account_type, rp.subscription_id, rp.is_admin, rp.created_at,
             rp.subscription_plan_id, rp.subscription_plan_code, rp.subscription_plan_name,
             rp.price, rp.monthly_price, rp.annual_price, rp.subscription_is_active,
             rp.plan_code_resolvido, rp.plan_source
),
individual_modules AS (
    SELECT 
        mi.*,
        ARRAY_AGG(iup.module_type ORDER BY iup.module_type) AS modulos_individuais_adicionados,
        ARRAY_AGG(iue.module_type ORDER BY iue.module_type) AS modulos_individuais_excluidos
    FROM modules_info mi
    LEFT JOIN individual_user_plans iup ON mi.id = iup.user_id
    LEFT JOIN individual_user_plan_exclusions iue ON mi.id = iue.user_id
    GROUP BY mi.id, mi.email, mi.account_type, mi.subscription_id, mi.is_admin, mi.created_at,
             mi.subscription_plan_id, mi.subscription_plan_code, mi.subscription_plan_name,
             mi.price, mi.monthly_price, mi.annual_price, mi.subscription_is_active,
             mi.plan_code_resolvido, mi.plan_source,
             mi.total_modulos_disponiveis, mi.total_modulos_indisponiveis,
             mi.modulos_disponiveis, mi.modulos_indisponiveis
)
SELECT 
    '=== DADOS DO USUÁRIO ===' AS secao,
    id AS user_id,
    email,
    account_type,
    subscription_id,
    is_admin,
    created_at,
    NULL AS info_adicional
FROM individual_modules

UNION ALL

SELECT 
    '=== PLANO DA ASSINATURA ===' AS secao,
    NULL AS user_id,
    NULL AS email,
    NULL AS account_type,
    NULL AS subscription_id,
    NULL AS is_admin,
    NULL AS created_at,
    CASE 
        WHEN subscription_plan_code IS NULL THEN 'Nenhum plano associado (subscription_id = NULL)'
        WHEN subscription_is_active = false THEN '⚠️ PLANO INATIVO: ' || subscription_plan_name || ' (' || subscription_plan_code || ')'
        ELSE '✅ Plano ativo: ' || subscription_plan_name || ' (' || subscription_plan_code || ') - R$ ' || COALESCE(monthly_price::text, price::text, 'N/A') || '/mês'
    END AS info_adicional
FROM individual_modules

UNION ALL

SELECT 
    '=== PLAN_CODE RESOLVIDO ===' AS secao,
    NULL AS user_id,
    NULL AS email,
    NULL AS account_type,
    NULL AS subscription_id,
    NULL AS is_admin,
    NULL AS created_at,
    COALESCE(plan_code_resolvido, 'basic') || ' (fonte: ' || COALESCE(plan_source, 'fallback (sem subscription_id e sem account_type válido)') || ')' AS info_adicional
FROM individual_modules

UNION ALL

SELECT 
    '=== MÓDULOS DO PLANO ===' AS secao,
    NULL AS user_id,
    NULL AS email,
    NULL AS account_type,
    NULL AS subscription_id,
    NULL AS is_admin,
    NULL AS created_at,
    CASE 
        WHEN total_modulos_disponiveis = 0 AND plan_code_resolvido IS NOT NULL THEN '⚠️ PROBLEMA: Nenhum módulo disponível para plan_code=' || plan_code_resolvido
        WHEN total_modulos_disponiveis = 0 AND plan_code_resolvido IS NULL THEN '⚠️ PROBLEMA: plan_code não foi resolvido. Verifique subscription_id e account_type.'
        WHEN total_modulos_disponiveis > 0 THEN '✅ ' || total_modulos_disponiveis || ' módulos disponíveis: ' || array_to_string(modulos_disponiveis, ', ')
        ELSE '⚠️ Não foi possível determinar módulos (plan_code não resolvido)'
    END AS info_adicional
FROM individual_modules

UNION ALL

SELECT 
    '=== MÓDULOS INDIVIDUAIS ===' AS secao,
    NULL AS user_id,
    NULL AS email,
    NULL AS account_type,
    NULL AS subscription_id,
    NULL AS is_admin,
    NULL AS created_at,
    CASE 
        WHEN modulos_individuais_adicionados IS NULL AND modulos_individuais_excluidos IS NULL THEN 'Nenhum módulo individual configurado'
        ELSE COALESCE('Adicionados: ' || array_to_string(modulos_individuais_adicionados, ', '), 'Nenhum adicionado') || 
             ' | ' || 
             COALESCE('Excluídos: ' || array_to_string(modulos_individuais_excluidos, ', '), 'Nenhum excluído')
    END AS info_adicional
FROM individual_modules

UNION ALL

SELECT 
    '=== FLAGS FINAIS (hasFinance, hasContract, hasAgenda) ===' AS secao,
    NULL AS user_id,
    NULL AS email,
    NULL AS account_type,
    NULL AS subscription_id,
    NULL AS is_admin,
    NULL AS created_at,
    'hasFinance=' || CASE WHEN 'finance' = ANY(modulos_disponiveis) OR 'finance' = ANY(COALESCE(modulos_individuais_adicionados, ARRAY[]::text[])) THEN 'true' ELSE 'false' END ||
    ' | hasContract=' || CASE WHEN 'contract' = ANY(modulos_disponiveis) OR 'contract' = ANY(COALESCE(modulos_individuais_adicionados, ARRAY[]::text[])) THEN 'true' ELSE 'false' END ||
    ' | hasAgenda=' || CASE WHEN 'agenda' = ANY(modulos_disponiveis) OR 'agenda' = ANY(COALESCE(modulos_individuais_adicionados, ARRAY[]::text[])) THEN 'true' ELSE 'false' END ||
    ' | hasModoEmpresa=' || CASE WHEN 'modo_empresa' = ANY(modulos_disponiveis) OR 'modo_empresa' = ANY(COALESCE(modulos_individuais_adicionados, ARRAY[]::text[])) THEN 'true' ELSE 'false' END
    AS info_adicional
FROM individual_modules;

-- ============================================
-- LISTA DE MÓDULOS DISPONÍVEIS (formato simples)
-- ============================================
WITH user_data AS (
    SELECT 
        u.id,
        u.email,
        u.account_type,
        u.subscription_id
    FROM users u
    WHERE u.email = 'playadrian@gmail.com'  -- ⬅️ ALTERE AQUI o email
),
resolved_plan AS (
    SELECT 
        ud.*,
        COALESCE(
            CASE 
                WHEN ud.subscription_id IS NOT NULL AND ud.subscription_id ~ '^[0-9]+$' THEN (
                    SELECT sp.plan_code 
                    FROM subscription_plans sp 
                    WHERE sp.id = CAST(ud.subscription_id AS INTEGER) AND sp.is_active = true
                )
                WHEN ud.account_type::text IN ('individual', 'basic', 'king_start') THEN 'basic'
                WHEN ud.account_type::text IN ('individual_com_logo', 'premium', 'king_prime') THEN 'premium'
                WHEN ud.account_type::text = 'king_base' OR ud.account_type::text = 'king_essential' THEN 'king_base'
                WHEN ud.account_type::text = 'king_finance' THEN 'king_finance'
                WHEN ud.account_type::text = 'king_finance_plus' THEN 'king_finance_plus'
                WHEN ud.account_type::text = 'king_premium_plus' THEN 'king_premium_plus'
                WHEN ud.account_type::text IN ('business_owner', 'enterprise', 'king_corporate') THEN 'king_corporate'
                WHEN ud.account_type::text IN ('adm_principal', 'abm') THEN 'adm_principal'
                WHEN ud.account_type::text = 'free' THEN 'free'
                WHEN ud.account_type::text IS NOT NULL THEN ud.account_type::text
                ELSE NULL
            END,
            'basic'  -- Fallback final: sempre retorna 'basic' se nada funcionar
        ) AS plan_code_resolvido
    FROM user_data ud
)
SELECT 
    mpa.module_type,
    mpa.is_available,
    CASE WHEN mpa.is_available THEN '✅ DISPONÍVEL' ELSE '❌ INDISPONÍVEL' END AS status
FROM resolved_plan rp
LEFT JOIN module_plan_availability mpa ON rp.plan_code_resolvido = mpa.plan_code
WHERE rp.plan_code_resolvido IS NOT NULL
ORDER BY mpa.is_available DESC, mpa.module_type;
