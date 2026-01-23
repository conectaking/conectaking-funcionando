-- Migration: Adicionar campo whatsapp_message à tabela subscription_plans
-- Data: 2025-01-31
-- Descrição: Adiciona campo para mensagem personalizada do WhatsApp para cada plano

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'whatsapp_message'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD COLUMN whatsapp_message TEXT;
        
        RAISE NOTICE 'Coluna whatsapp_message adicionada com sucesso à tabela subscription_plans';
    ELSE
        RAISE NOTICE 'Coluna whatsapp_message já existe na tabela subscription_plans';
    END IF;
END $$;

-- Atualizar mensagens padrão para cada plano (será sobrescrito pela migration 085 se aplicada depois)
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
    whatsapp_message
FROM subscription_plans
ORDER BY price ASC;

