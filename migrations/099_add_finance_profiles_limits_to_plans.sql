-- Migration: Adicionar limites de perfis financeiros aos planos e criar novos planos
-- Data: 2026-01-19
-- Descrição: Adiciona campo max_finance_profiles aos planos e cria novos planos para gestão financeira

DO $$
BEGIN
    -- Atualizar planos existentes com limite de perfis financeiros
    -- Todos os planos básicos têm apenas 1 perfil (o principal)
    
    -- Atualizar plano basic (480) - 1 perfil (apenas principal)
    UPDATE subscription_plans 
    SET features = jsonb_set(
        COALESCE(features, '{}'::jsonb),
        '{max_finance_profiles}',
        '1'::jsonb
    )
    WHERE plan_code = 'basic';
    
    -- Atualizar plano premium (700) - 1 perfil (apenas principal)
    UPDATE subscription_plans 
    SET features = jsonb_set(
        COALESCE(features, '{}'::jsonb),
        '{max_finance_profiles}',
        '1'::jsonb
    )
    WHERE plan_code = 'premium';
    
    -- Atualizar plano enterprise (1500) - 1 perfil (apenas principal)
    UPDATE subscription_plans 
    SET features = jsonb_set(
        COALESCE(features, '{}'::jsonb),
        '{max_finance_profiles}',
        '1'::jsonb
    )
    WHERE plan_code = 'enterprise';
    
    -- Criar novo plano King Finance (1700) - 2 perfis (1 principal + 1 adicional)
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_finance',
        'King Finance',
        1700.00,
        'Plano com acesso completo a todos os módulos + Separação de pacotes com 2 perfis (1 principal + 1 adicional)',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 2, "has_finance_module": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    -- Criar novo plano King Finance Plus (2200) - 3 perfis (1 principal + 2 adicionais) - Modo Individual
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    VALUES (
        'king_finance_plus',
        'King Finance Plus',
        2200.00,
        'Plano individual premium com acesso completo a todos os módulos + Separação de pacotes com 3 perfis (1 principal + 2 adicionais)',
        '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "max_finance_profiles": 3, "has_finance_module": true, "is_individual": true}'::jsonb,
        true
    )
    ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RAISE NOTICE 'Planos atualizados e novos planos criados com sucesso!';
    
END $$;

-- Verificar planos criados
SELECT 
    plan_code,
    plan_name,
    price,
    features->>'max_finance_profiles' as max_finance_profiles,
    is_active
FROM subscription_plans
ORDER BY price ASC;
