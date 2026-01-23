-- Migration: Atualizar planos para nomenclatura King (King Start, King Prime, King Corporate)
-- Data: 2025-01-XX
-- Descrição: Atualiza os nomes, preços e descrições dos planos conforme nova proposta comercial

-- Atualizar King Start (antigo Pacote 1)
UPDATE subscription_plans 
SET 
    plan_name = 'King Start',
    price = 700.00,
    description = 'Ideal para quem deseja iniciar sua presença digital com elegância e praticidade. Inclui ConectaKing NFC, cartão digital personalizado, links essenciais (WhatsApp, Instagram, redes sociais) e ativação/configuração inicial.',
    features = '{"can_add_all_modules": true, "can_edit_logo": false, "max_profiles": 1, "includes_nfc": true, "includes_card": true, "includes_essential_links": true, "includes_activation": true}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_code = 'basic';

-- Atualizar King Prime (antigo Pacote 2)
UPDATE subscription_plans 
SET 
    plan_name = 'King Prime',
    price = 1000.00,
    description = 'Criado para profissionais que buscam impacto, autoridade e máximo aproveitamento da tecnologia. Inclui ConectaKing NFC Premium, cartão digital completo e altamente personalizado, links ilimitados, portfólio, localização, botões inteligentes, atualizações assistidas e ativação/configuração completas.',
    features = '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1, "includes_nfc": true, "includes_premium_card": true, "unlimited_links": true, "includes_portfolio": true, "includes_location": true, "smart_buttons": true, "assisted_updates": true, "includes_activation": true}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_code = 'premium';

-- Atualizar King Corporate (antigo Pacote 3)
UPDATE subscription_plans 
SET 
    plan_name = 'King Corporate',
    price = 2300.00,
    description = 'A escolha ideal para empresas, equipes comerciais e marcas que desejam padronização, profissionalismo e conversão. Inclui Modo Empresa ConectaKing, página institucional personalizada, centralização de contatos corporativos, direcionamento estratégico de leads, uso corporativo do ConectaKing NFC, suporte prioritário e ativação/configuração completas.',
    features = '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 3, "is_enterprise": true, "includes_enterprise_mode": true, "includes_institutional_page": true, "corporate_contacts": true, "lead_direction": true, "corporate_nfc": true, "priority_support": true, "includes_activation": true}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_code = 'enterprise';

-- Atualizar mensagens do WhatsApp
UPDATE subscription_plans 
SET whatsapp_message = CASE
    WHEN plan_code = 'basic' THEN 'Olá! Gostaria de assinar o plano King Start e iniciar minha presença digital com elegância e praticidade! 👑🚀'
    WHEN plan_code = 'premium' THEN 'Olá! Gostaria de assinar o plano King Prime e ter acesso completo com máximo aproveitamento da tecnologia! 👑✨'
    WHEN plan_code = 'enterprise' THEN 'Olá! Gostaria de assinar o plano King Corporate para minha empresa e ter padronização, profissionalismo e conversão! 👑💼'
    ELSE whatsapp_message
END
WHERE whatsapp_message IS NULL OR whatsapp_message LIKE '%Pacote%';

-- Verificação
SELECT 
    plan_code, 
    plan_name, 
    price, 
    description,
    is_active
FROM subscription_plans
ORDER BY price ASC;
