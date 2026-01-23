-- Migration: Criar tabela subscription_plans
-- Data: 2025-01-31
-- Descrição: Tabela para armazenar planos de assinatura editáveis pelo ADM

-- Criar tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL, -- 'basic', 'premium', 'enterprise'
    plan_name VARCHAR(100) NOT NULL, -- 'Pacote 1', 'Pacote 2', 'Pacote 3'
    price DECIMAL(10, 2) NOT NULL, -- Preço em reais
    description TEXT, -- Descrição do plano
    features JSONB, -- Recursos do plano em formato JSON
    whatsapp_number VARCHAR(20), -- Número do WhatsApp para contato
    pix_key VARCHAR(255), -- Chave PIX para pagamento
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir planos padrão
INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, whatsapp_number, pix_key) VALUES
('basic', 'Pacote 1', 480.00, 'Plano básico com todas as funcionalidades do cartão, exceto alteração de logomarca', 
 '{"can_add_all_modules": true, "can_edit_logo": false, "max_profiles": 1}'::jsonb,
 NULL, NULL),
('premium', 'Pacote 2', 700.00, 'Plano premium com todas as funcionalidades incluindo alteração de logomarca', 
 '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 1}'::jsonb,
 NULL, NULL),
('enterprise', 'Pacote 3', 1500.00, 'Plano empresarial com três assinaturas e logomarca personalizável para cada cartão', 
 '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 3, "is_enterprise": true}'::jsonb,
 NULL, NULL)
ON CONFLICT (plan_code) DO NOTHING;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON subscription_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Verificação
SELECT 
    plan_code, 
    plan_name, 
    price, 
    is_active
FROM subscription_plans
ORDER BY price ASC;

