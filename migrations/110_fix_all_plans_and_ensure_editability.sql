-- Migration: Corrigir todos os planos e garantir editabilidade
-- Data: 2026-01-23
-- Descrição: Garante que todos os 7 planos existam, remove duplicatas, e garante que todos sejam editáveis

DO $$
BEGIN
    -- ============================================
    -- REMOVER DUPLICATAS: Desativar 'enterprise' se 'king_corporate' existir
    -- ============================================
    UPDATE subscription_plans 
    SET is_active = false, updated_at = NOW()
    WHERE plan_code = 'enterprise' 
    AND EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'king_corporate' AND is_active = true);
    
    -- ============================================
    -- PLANO 1: King Start (basic) - R$ 700
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'basic',
        'King Start',
        700.00,
        'Ideal para quem deseja iniciar sua presença digital com elegância e praticidade. Uso Individual.',
        '{"can_add_all_modules": true, "can_edit_logo": false, "max_profiles": 1}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = true,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 2: King Prime (premium) - R$ 1.000
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'premium',
        'King Prime',
        1000.00,
        'Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia. Uso Individual Premium.',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = true,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 3: King Essential (king_base) - R$ 1.500
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
        is_active = true,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 4: King Finance (king_finance) - R$ 1.700
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_finance',
        'King Finance',
        1700.00,
        'Plano com acesso completo a todos os módulos + Gestão Financeira',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 1, "has_finance_module": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = true,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 5: King Finance Plus (king_finance_plus) - R$ 2.000
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_finance_plus',
        'King Finance Plus',
        2000.00,
        'Plano individual premium com acesso completo a todos os módulos + Separação de pacotes com 2 perfis de gestão financeira',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 2, "has_finance_module": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = true,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 6: King Premium Plus (king_premium_plus) - R$ 2.200
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_premium_plus',
        'King Premium Plus',
        2200.00,
        'Plano premium completo com acesso a todos os módulos + Gestão Financeira + Contratos + Agenda Inteligente',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 1, "has_finance_module": true, "has_contract_module": true, "has_agenda_module": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = true,
        updated_at = NOW();
    
    -- ============================================
    -- PLANO 7: King Corporate (king_corporate) - R$ 2.300
    -- ============================================
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_corporate',
        'King Corporate',
        2300.00,
        'Plano corporativo com acesso completo a todos os módulos + Modo Empresa + 3 cartões + Logomarca personalizável + Suporte prioritário',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 3, "max_finance_profiles": 1, "is_enterprise": true, "is_corporate": true, "modo_empresa": true, "suporte_prioritario": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Planos corrigidos e garantidos com sucesso!';
    
END $$;

-- Verificar planos ativos (deve retornar exatamente 7)
SELECT 
    plan_code,
    plan_name,
    price,
    is_active,
    created_at,
    updated_at
FROM subscription_plans
WHERE is_active = true
ORDER BY price ASC;

-- Contar planos ativos (deve ser 7)
SELECT COUNT(*) as total_planos_ativos
FROM subscription_plans
WHERE is_active = true;
