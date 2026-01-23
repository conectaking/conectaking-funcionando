-- Migration: Adicionar campos de preço mensal e anual aos planos
-- Data: 2026-01-23
-- Descrição: Adiciona campos monthly_price e annual_price para suportar planos mensais e anuais

DO $$
BEGIN
    -- Adicionar colunas monthly_price e annual_price se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'monthly_price'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD COLUMN monthly_price DECIMAL(10, 2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' 
        AND column_name = 'annual_price'
    ) THEN
        ALTER TABLE subscription_plans 
        ADD COLUMN annual_price DECIMAL(10, 2);
    END IF;
    
    -- Atualizar preços mensais e anuais baseados nos preços atuais
    -- King Start (basic): R$ 70,00/mês, R$ 700,00/ano
    UPDATE subscription_plans 
    SET monthly_price = 70.00, annual_price = 700.00
    WHERE plan_code = 'basic';
    
    -- King Prime (premium): R$ 100,00/mês, R$ 1000,00/ano
    UPDATE subscription_plans 
    SET monthly_price = 100.00, annual_price = 1000.00
    WHERE plan_code = 'premium';
    
    -- King Essential (king_base): R$ 150,00/mês, R$ 1500,00/ano
    UPDATE subscription_plans 
    SET monthly_price = 150.00, annual_price = 1500.00
    WHERE plan_code = 'king_base';
    
    -- King Finance (king_finance): R$ 170,00/mês, R$ 1700,00/ano (baseado no preço atual)
    UPDATE subscription_plans 
    SET monthly_price = 170.00, annual_price = 1700.00
    WHERE plan_code = 'king_finance';
    
    -- King Finance Plus (king_finance_plus): R$ 200,00/mês, R$ 2000,00/ano
    UPDATE subscription_plans 
    SET monthly_price = 200.00, annual_price = 2000.00
    WHERE plan_code = 'king_finance_plus';
    
    -- King Premium Plus (king_premium_plus): R$ 220,00/mês, R$ 2200,00/ano
    UPDATE subscription_plans 
    SET monthly_price = 220.00, annual_price = 2200.00
    WHERE plan_code = 'king_premium_plus';
    
    -- King Corporate (king_corporate): R$ 230,00/mês, R$ 2300,00/ano
    UPDATE subscription_plans 
    SET monthly_price = 230.00, annual_price = 2300.00
    WHERE plan_code = 'king_corporate';
    
    -- Se algum plano não tiver preços definidos, usar o preço atual como anual e calcular mensal (anual / 12)
    UPDATE subscription_plans 
    SET 
        annual_price = COALESCE(annual_price, price),
        monthly_price = COALESCE(monthly_price, ROUND((price / 12)::numeric, 2))
    WHERE monthly_price IS NULL OR annual_price IS NULL;
    
    RAISE NOTICE 'Campos monthly_price e annual_price adicionados e atualizados com sucesso!';
END $$;

-- Verificar os preços atualizados
SELECT 
    plan_code,
    plan_name,
    price as preco_atual,
    monthly_price as preco_mensal,
    annual_price as preco_anual
FROM subscription_plans
WHERE is_active = true
ORDER BY monthly_price ASC;
