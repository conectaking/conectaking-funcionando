-- Migration: Restaurar planos originais (King Start e King Prime)
-- Data: 2026-01-19
-- Descrição: Restaura os planos básicos que foram desativados: King Start (R$ 700) e King Prime (R$ 1000)

DO $$
BEGIN
    -- Restaurar King Start (basic) - R$ 700
    UPDATE subscription_plans 
    SET 
        plan_name = 'King Start',
        price = 700.00,
        description = 'Ideal para quem deseja iniciar sua presença digital com elegância e praticidade. Uso Individual.',
        features = '{
            "conectaking_nfc": true,
            "cartao_digital_personalizado": true,
            "links_essenciais": true,
            "ativacao_configuracao_inicial": true,
            "links_ilimitados": false,
            "portfolio_localizacao_botoes_inteligentes": false,
            "atualizacoes_assistidas": false,
            "ativacao_configuracao_completas": false,
            "modo_empresa": false,
            "can_add_all_modules": true,
            "can_edit_logo": false,
            "max_profiles": 1,
            "max_finance_profiles": 1
        }'::jsonb,
        is_active = true,
        updated_at = NOW()
    WHERE plan_code = 'basic';
    
    -- Se não existir, criar
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    SELECT 
        'basic',
        'King Start',
        700.00,
        'Ideal para quem deseja iniciar sua presença digital com elegância e praticidade. Uso Individual.',
        '{
            "conectaking_nfc": true,
            "cartao_digital_personalizado": true,
            "links_essenciais": true,
            "ativacao_configuracao_inicial": true,
            "links_ilimitados": false,
            "portfolio_localizacao_botoes_inteligentes": false,
            "atualizacoes_assistidas": false,
            "ativacao_configuracao_completas": false,
            "modo_empresa": false,
            "can_add_all_modules": true,
            "can_edit_logo": false,
            "max_profiles": 1,
            "max_finance_profiles": 1
        }'::jsonb,
        true
    WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'basic');
    
    -- Restaurar King Prime (premium) - R$ 1000
    UPDATE subscription_plans 
    SET 
        plan_name = 'King Prime',
        price = 1000.00,
        description = 'Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia. Uso Individual Premium.',
        features = '{
            "conectaking_nfc": true,
            "cartao_digital_personalizado": true,
            "links_essenciais": true,
            "ativacao_configuracao_inicial": true,
            "links_ilimitados": true,
            "portfolio_localizacao_botoes_inteligentes": true,
            "atualizacoes_assistidas": true,
            "ativacao_configuracao_completas": true,
            "modo_empresa": false,
            "can_add_all_modules": true,
            "can_edit_logo": true,
            "max_profiles": 1,
            "max_finance_profiles": 1,
            "nfc_premium": true,
            "portfolio": true,
            "atualizacoes_assistidas": true
        }'::jsonb,
        is_active = true,
        updated_at = NOW()
    WHERE plan_code = 'premium';
    
    -- Se não existir, criar
    INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
    SELECT 
        'premium',
        'King Prime',
        1000.00,
        'Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia. Uso Individual Premium.',
        '{
            "conectaking_nfc": true,
            "cartao_digital_personalizado": true,
            "links_essenciais": true,
            "ativacao_configuracao_inicial": true,
            "links_ilimitados": true,
            "portfolio_localizacao_botoes_inteligentes": true,
            "atualizacoes_assistidas": true,
            "ativacao_configuracao_completas": true,
            "modo_empresa": false,
            "can_add_all_modules": true,
            "can_edit_logo": true,
            "max_profiles": 1,
            "max_finance_profiles": 1,
            "nfc_premium": true,
            "portfolio": true,
            "atualizacoes_assistidas": true
        }'::jsonb,
        true
    WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'premium');
    
    RAISE NOTICE 'Planos originais restaurados com sucesso!';
    
END $$;

-- Verificar planos ativos
SELECT 
    plan_code,
    plan_name,
    price,
    is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY price ASC;
