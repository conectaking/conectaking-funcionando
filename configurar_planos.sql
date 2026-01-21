-- Script SQL para configurar WhatsApp, mensagens e PIX nos planos que estão faltando
-- Execute este script diretamente no banco de dados PostgreSQL

-- Primeiro, vamos buscar o número de WhatsApp de um plano que já está configurado
-- e usar esse número para os outros planos

-- Buscar número de WhatsApp já configurado (prioridade: basic, premium)
DO $$
DECLARE
    default_whatsapp VARCHAR(20);
    default_pix VARCHAR(255);
    plan_whatsapp VARCHAR(20);
BEGIN
    -- Buscar WhatsApp de um plano já configurado
    SELECT whatsapp_number INTO plan_whatsapp
    FROM subscription_plans
    WHERE whatsapp_number IS NOT NULL 
      AND whatsapp_number != ''
      AND whatsapp_number != '0'
      AND plan_code IN ('basic', 'premium', 'enterprise')
    ORDER BY CASE 
        WHEN plan_code = 'basic' THEN 1
        WHEN plan_code = 'premium' THEN 2
        WHEN plan_code = 'enterprise' THEN 3
        ELSE 4
    END
    LIMIT 1;
    
    -- Se não encontrar, buscar qualquer plano com WhatsApp
    IF plan_whatsapp IS NULL OR plan_whatsapp = '' THEN
        SELECT whatsapp_number INTO plan_whatsapp
        FROM subscription_plans
        WHERE whatsapp_number IS NOT NULL 
          AND whatsapp_number != ''
          AND whatsapp_number != '0'
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrar, usar número padrão
    IF plan_whatsapp IS NULL OR plan_whatsapp = '' THEN
        default_whatsapp := '5511988789417';
    ELSE
        default_whatsapp := plan_whatsapp;
    END IF;
    
    -- Converter WhatsApp para PIX: substituir 55 no início por 11
    IF default_whatsapp LIKE '55%' THEN
        default_pix := '11' || SUBSTRING(default_whatsapp FROM 3);
    ELSIF default_whatsapp LIKE '11%' THEN
        default_pix := default_whatsapp;
    ELSE
        default_pix := '11' || default_whatsapp;
    END IF;
    
    -- Atualizar King Corporate
    UPDATE subscription_plans
    SET 
        whatsapp_number = default_whatsapp,
        whatsapp_message = 'Olá! Gostaria de adquirir o plano King Corporate do ConectaKing! 👑💼',
        pix_key = default_pix,
        updated_at = CURRENT_TIMESTAMP
    WHERE plan_code = 'king_corporate';
    
    -- Atualizar King Premium Plus
    UPDATE subscription_plans
    SET 
        whatsapp_number = default_whatsapp,
        whatsapp_message = 'Olá! Gostaria de adquirir o plano King Premium Plus do ConectaKing! 👑✨',
        pix_key = default_pix,
        updated_at = CURRENT_TIMESTAMP
    WHERE plan_code = 'king_premium_plus';
    
    -- Atualizar King Finance Plus
    UPDATE subscription_plans
    SET 
        whatsapp_number = default_whatsapp,
        whatsapp_message = 'Olá! Gostaria de adquirir o plano King Finance Plus do ConectaKing! 👑💰',
        pix_key = default_pix,
        updated_at = CURRENT_TIMESTAMP
    WHERE plan_code = 'king_finance_plus';
    
    -- Atualizar King Essential (king_base)
    UPDATE subscription_plans
    SET 
        whatsapp_number = default_whatsapp,
        whatsapp_message = 'Olá! Gostaria de adquirir o plano King Essential do ConectaKing! 👑🌟',
        pix_key = default_pix,
        updated_at = CURRENT_TIMESTAMP
    WHERE plan_code = 'king_base';
    
    -- Atualizar King Finance
    UPDATE subscription_plans
    SET 
        whatsapp_number = default_whatsapp,
        whatsapp_message = 'Olá! Gostaria de adquirir o plano King Finance do ConectaKing! 👑💵',
        pix_key = default_pix,
        updated_at = CURRENT_TIMESTAMP
    WHERE plan_code = 'king_finance';
    
    RAISE NOTICE 'Planos configurados com sucesso!';
    RAISE NOTICE 'WhatsApp usado: %', default_whatsapp;
    RAISE NOTICE 'PIX usado: %', default_pix;
    
END $$;

-- Verificar o resultado
SELECT 
    plan_code,
    plan_name,
    whatsapp_number,
    LEFT(whatsapp_message, 60) as message_preview,
    LEFT(pix_key, 20) as pix_preview
FROM subscription_plans
WHERE plan_code IN ('king_corporate', 'king_premium_plus', 'king_finance_plus', 'king_base', 'king_finance')
ORDER BY price ASC;
