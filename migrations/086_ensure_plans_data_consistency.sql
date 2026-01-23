-- Migration: Garantir consistência dos dados dos planos
-- Data: 2025-01-31
-- Descrição: Garante que os planos estão atualizados e consistentes para uso na landing page e dashboard

-- Verificar e atualizar planos se necessário
-- Esta migration garante que os dados estão corretos, mesmo que a migration 085 já tenha sido executada

-- Atualizar o plano 'basic' para 'King Start' (se ainda não estiver atualizado)
UPDATE subscription_plans
SET
    plan_name = COALESCE(NULLIF(plan_name, ''), 'King Start'),
    price = COALESCE(NULLIF(price, 0), 700.00),
    description = COALESCE(NULLIF(description, ''), 'Ideal para quem deseja iniciar sua presença digital com elegância e praticidade. Uso Individual.'),
    features = COALESCE(
        NULLIF(features::text, '{}'::text)::jsonb,
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
            "centralizacao_contatos_corporativos": false,
            "direcionamento_estrategico_leads": false,
            "uso_corporativo_nfc": false,
            "suporte_prioritario": false,
            "can_add_all_modules": true,
            "can_edit_logo": false,
            "max_profiles": 1
        }'::jsonb
    ),
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_code = 'basic'
AND (
    plan_name IS NULL OR plan_name = '' OR
    price IS NULL OR price = 0 OR
    description IS NULL OR description = '' OR
    features IS NULL OR features::text = '{}'
);

-- Atualizar o plano 'premium' para 'King Prime' (se ainda não estiver atualizado)
UPDATE subscription_plans
SET
    plan_name = COALESCE(NULLIF(plan_name, ''), 'King Prime'),
    price = COALESCE(NULLIF(price, 0), 1000.00),
    description = COALESCE(NULLIF(description, ''), 'Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia. Uso Individual Premium.'),
    features = COALESCE(
        NULLIF(features::text, '{}'::text)::jsonb,
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
            "centralizacao_contatos_corporativos": false,
            "direcionamento_estrategico_leads": false,
            "uso_corporativo_nfc": false,
            "suporte_prioritario": false,
            "can_add_all_modules": true,
            "can_edit_logo": true,
            "max_profiles": 1
        }'::jsonb
    ),
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_code = 'premium'
AND (
    plan_name IS NULL OR plan_name = '' OR
    price IS NULL OR price = 0 OR
    description IS NULL OR description = '' OR
    features IS NULL OR features::text = '{}'
);

-- Atualizar o plano 'enterprise' para 'King Corporate' (se ainda não estiver atualizado)
UPDATE subscription_plans
SET
    plan_name = COALESCE(NULLIF(plan_name, ''), 'King Corporate'),
    price = COALESCE(NULLIF(price, 0), 2300.00),
    description = COALESCE(NULLIF(description, ''), 'A escolha ideal para empresas, equipes comerciais e marcas que desejam padronização, profissionalismo e conversão. Modo Empresa.'),
    features = COALESCE(
        NULLIF(features::text, '{}'::text)::jsonb,
        '{
            "conectaking_nfc": true,
            "cartao_digital_personalizado": true,
            "links_essenciais": true,
            "ativacao_configuracao_inicial": true,
            "links_ilimitados": true,
            "portfolio_localizacao_botoes_inteligentes": true,
            "atualizacoes_assistidas": true,
            "ativacao_configuracao_completas": true,
            "modo_empresa": true,
            "centralizacao_contatos_corporativos": true,
            "direcionamento_estrategico_leads": true,
            "uso_corporativo_nfc": true,
            "suporte_prioritario": true,
            "can_add_all_modules": true,
            "can_edit_logo": true,
            "max_profiles": 3,
            "is_enterprise": true
        }'::jsonb
    ),
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_code = 'enterprise'
AND (
    plan_name IS NULL OR plan_name = '' OR
    price IS NULL OR price = 0 OR
    description IS NULL OR description = '' OR
    features IS NULL OR features::text = '{}'
);

-- Garantir que os planos existem (INSERT se não existirem)
INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active, created_at, updated_at)
SELECT 'basic', 'King Start', 700.00, 'Ideal para quem deseja iniciar sua presença digital com elegância e praticidade. Uso Individual.', 
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
        "centralizacao_contatos_corporativos": false,
        "direcionamento_estrategico_leads": false,
        "uso_corporativo_nfc": false,
        "suporte_prioritario": false,
        "can_add_all_modules": true,
        "can_edit_logo": false,
        "max_profiles": 1
    }'::jsonb,
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'basic');

INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active, created_at, updated_at)
SELECT 'premium', 'King Prime', 1000.00, 'Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia. Uso Individual Premium.',
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
        "centralizacao_contatos_corporativos": false,
        "direcionamento_estrategico_leads": false,
        "uso_corporativo_nfc": false,
        "suporte_prioritario": false,
        "can_add_all_modules": true,
        "can_edit_logo": true,
        "max_profiles": 1
    }'::jsonb,
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'premium');

INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active, created_at, updated_at)
SELECT 'enterprise', 'King Corporate', 2300.00, 'A escolha ideal para empresas, equipes comerciais e marcas que desejam padronização, profissionalismo e conversão. Modo Empresa.',
    '{
        "conectaking_nfc": true,
        "cartao_digital_personalizado": true,
        "links_essenciais": true,
        "ativacao_configuracao_inicial": true,
        "links_ilimitados": true,
        "portfolio_localizacao_botoes_inteligentes": true,
        "atualizacoes_assistidas": true,
        "ativacao_configuracao_completas": true,
        "modo_empresa": true,
        "centralizacao_contatos_corporativos": true,
        "direcionamento_estrategico_leads": true,
        "uso_corporativo_nfc": true,
        "suporte_prioritario": true,
        "can_add_all_modules": true,
        "can_edit_logo": true,
        "max_profiles": 3,
        "is_enterprise": true
    }'::jsonb,
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'enterprise');

-- Verificação final
SELECT 
    plan_code, 
    plan_name, 
    price, 
    is_active,
    CASE 
        WHEN features IS NULL OR features::text = '{}' THEN '⚠️ Features vazias'
        ELSE '✅ OK'
    END as status_features
FROM subscription_plans
ORDER BY price ASC;
