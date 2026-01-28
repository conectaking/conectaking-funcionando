-- Migration: King Prime (premium) SEM Gestão Financeira, Contratos e Agenda
-- Descrição: O plano King Prime (R$ 100/mês, R$ 1000/ano) NÃO inclui esses módulos.
--            Apenas planos superiores (ex.: King Finance) têm esses módulos.

UPDATE module_plan_availability
SET is_available = false
WHERE plan_code = 'premium'
  AND module_type IN ('finance', 'contract', 'agenda');

-- Verificação
SELECT plan_code, module_type, is_available
FROM module_plan_availability
WHERE plan_code = 'premium'
  AND module_type IN ('finance', 'contract', 'agenda')
ORDER BY module_type;
