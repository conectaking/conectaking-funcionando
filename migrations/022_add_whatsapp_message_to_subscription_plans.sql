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

-- Atualizar mensagens padrão para cada plano
UPDATE subscription_plans 
SET whatsapp_message = CASE
    WHEN plan_code = 'basic' THEN 'Olá! Gostaria de renovar o meu Pacote 1 e continuar aproveitando todas as funcionalidades do Conecta King! 🚀'
    WHEN plan_code = 'premium' THEN 'Olá! Gostaria de renovar o meu Pacote 2 e continuar com acesso completo, incluindo personalização de logomarca! ✨'
    WHEN plan_code = 'enterprise' THEN 'Olá! Gostaria de renovar o meu Pacote 3 (Empresarial) e manter meus três perfis com todas as funcionalidades premium! 💼'
    ELSE whatsapp_message
END
WHERE whatsapp_message IS NULL;

-- Verificação
SELECT 
    plan_code,
    plan_name,
    whatsapp_message
FROM subscription_plans
ORDER BY price ASC;

