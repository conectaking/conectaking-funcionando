-- Migration: Garantir que King Start (basic) NÃO tenha Gestão Financeira, Contratos e Agenda
-- Descrição: Garante que clientes no plano King Start não vejam esses botões no dashboard.
--            Insere ou atualiza os registros para is_available = false.

-- King Start (basic): garantir finance, contract, agenda = false (inserir se não existir, atualizar se existir)
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
VALUES 
    ('finance', 'basic', false),
    ('contract', 'basic', false),
    ('agenda', 'basic', false)
ON CONFLICT (module_type, plan_code) DO UPDATE SET is_available = false;

-- Verificação
SELECT plan_code, module_type, is_available
FROM module_plan_availability
WHERE plan_code = 'basic'
  AND module_type IN ('finance', 'contract', 'agenda')
ORDER BY module_type;
