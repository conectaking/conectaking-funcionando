-- Migration: Reorganizar planos de assinatura conforme nova estrutura
-- Data: 2026-01-19
-- Descrição: Remove planos antigos e cria novos planos: R$ 1.500, R$ 1.700 (2 perfis), R$ 2.000 (3 perfis), R$ 2.200 (com módulos extras), R$ 2.300 (Corporativo)

DO $$
BEGIN
    -- Manter planos originais ativos (basic, premium, enterprise)
    -- Apenas desativar planos 'free' se existirem
    UPDATE subscription_plans 
    SET is_active = false, updated_at = NOW()
    WHERE plan_code = 'free';
    
    -- ============================================
    -- PLANO 1: R$ 1.500 - King Essential
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_base',
        'King Essential',
        1500.00,
        'Plano essencial com acesso completo a todos os módulos + Logomarca editável',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 1}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 2: R$ 1.700 - King Finance (1 perfil)
    -- Inclui todas as features do King Prime + Gestão Financeira
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_finance',
        'King Finance',
        1700.00,
        'Plano com acesso completo a todos os módulos + Gestão Financeira',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 1, "has_finance_module": true, "nfc_premium": true, "links_ilimitados": true, "portfolio": true, "atualizacoes_assistidas": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 3: R$ 2.000 - King Finance Plus (2 perfis)
    -- Inclui todas as features do King Prime + Separação de pacotes com 2 perfis
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_finance_plus',
        'King Finance Plus',
        2000.00,
        'Plano individual premium com acesso completo a todos os módulos + Separação de pacotes com 2 perfis de gestão financeira',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 2, "has_finance_module": true, "is_individual": true, "nfc_premium": true, "links_ilimitados": true, "portfolio": true, "atualizacoes_assistidas": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 4: R$ 2.200 - King Premium Plus (com Gestão Financeira, Contratos e Agenda)
    -- Inclui todas as features do King Prime + módulos extras
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_premium_plus',
        'King Premium Plus',
        2200.00,
        'Plano premium completo com acesso a todos os módulos + Gestão Financeira + Contratos + Agenda Inteligente',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 1, "has_finance_module": true, "has_contract_module": true, "has_agenda_module": true, "nfc_premium": true, "links_ilimitados": true, "portfolio": true, "atualizacoes_assistidas": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 5: R$ 2.300 - King Corporate (Corporativo)
    -- Modo Empresa com todas as features do King Corporate
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_corporate',
        'King Corporate',
        2300.00,
        'Plano corporativo com acesso completo a todos os módulos + Modo Empresa + 3 cartões + Logomarca personalizável + Suporte prioritário',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 3, "max_finance_profiles": 1, "is_enterprise": true, "is_corporate": true, "modo_empresa": true, "suporte_prioritario": true, "pagina_institucional": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RAISE NOTICE 'Planos reorganizados com sucesso!';
    
END $$;

-- Verificar planos criados
SELECT 
    plan_code,
    plan_name,
    price,
    features->>'max_profiles' as max_profiles,
    features->>'max_finance_profiles' as max_finance_profiles,
    is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY price ASC;
