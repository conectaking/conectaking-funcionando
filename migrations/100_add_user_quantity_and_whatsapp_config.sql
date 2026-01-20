-- Migration: Adicionar campos de quantidade de usuários e configuração de WhatsApp
-- Data: 2026-01-19
-- Descrição: Adiciona campos para quantidade de usuários, preço por usuário e configuração de WhatsApp para planos financeiros

DO $$
BEGIN
    -- Adicionar campos de quantidade de usuários e preço por usuário aos planos financeiros
    UPDATE subscription_plans 
    SET features = jsonb_set(
        jsonb_set(
            COALESCE(features, '{}'::jsonb),
            '{user_quantity_options}',
            '[1, 2, 3, 4]'::jsonb
        ),
        '{price_per_user}',
        '0'::jsonb
    )
    WHERE plan_code IN ('king_finance', 'king_finance_plus');
    
    -- Adicionar mensagens padrão do WhatsApp se não existirem
    UPDATE subscription_plans 
    SET whatsapp_message = CASE
        WHEN plan_code = 'king_finance' THEN 'Olá! Gostaria de assinar o plano King Finance para ter acesso a 2 perfis na Separação de pacotes! 👑💰'
        WHEN plan_code = 'king_finance_plus' THEN 'Olá! Gostaria de assinar o plano King Finance Plus para ter acesso a 3 perfis na Separação de pacotes! 👑✨'
        ELSE whatsapp_message
    END
    WHERE plan_code IN ('king_finance', 'king_finance_plus') 
    AND (whatsapp_message IS NULL OR whatsapp_message = '');
    
    RAISE NOTICE 'Campos de quantidade de usuários e mensagens WhatsApp atualizados com sucesso!';
    
END $$;

-- Criar tabela de configuração de WhatsApp (se não existir)
CREATE TABLE IF NOT EXISTS finance_whatsapp_config (
    id SERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL REFERENCES subscription_plans(plan_code) ON DELETE CASCADE,
    whatsapp_number VARCHAR(20) NOT NULL,
    whatsapp_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_finance_whatsapp_config_plan_code ON finance_whatsapp_config(plan_code);

-- Inserir configurações padrão se não existirem
INSERT INTO finance_whatsapp_config (plan_code, whatsapp_number, whatsapp_message)
SELECT 
    sp.plan_code,
    COALESCE(sp.whatsapp_number, ''),
    COALESCE(sp.whatsapp_message, 'Olá! Gostaria de assinar este plano!')
FROM subscription_plans sp
WHERE sp.plan_code IN ('king_finance', 'king_finance_plus')
ON CONFLICT (plan_code) DO UPDATE SET
    whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, finance_whatsapp_config.whatsapp_number),
    whatsapp_message = COALESCE(EXCLUDED.whatsapp_message, finance_whatsapp_config.whatsapp_message),
    updated_at = NOW();

-- Verificar configurações criadas
SELECT 
    plan_code,
    whatsapp_number,
    LEFT(whatsapp_message, 50) as message_preview
FROM finance_whatsapp_config
ORDER BY plan_code;
