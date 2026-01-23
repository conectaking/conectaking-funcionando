-- Migration: Renomear King Base para King Essential
-- Data: 2026-01-19
-- Descrição: Renomeia o plano King Base para King Essential

UPDATE subscription_plans 
SET 
    plan_name = 'King Essential',
    description = 'Plano essencial com acesso completo a todos os módulos + Logomarca editável',
    updated_at = NOW()
WHERE plan_code = 'king_base';

-- Verificar alteração
SELECT 
    plan_code,
    plan_name,
    price,
    is_active
FROM subscription_plans
WHERE plan_code = 'king_base';
