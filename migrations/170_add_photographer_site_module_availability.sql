-- ===========================================
-- Migration: Inserir Meu site (photographer_site) em module_plan_availability
-- Descrição: Disponibiliza o módulo "Meu site" na Separação de Pacotes para controle por plano
-- ===========================================

DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'premium', 'king_base', 'king_essential',
        'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal'
    ];
    plan_code_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'photographer_site', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'photographer_site' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

-- Também inserir para planos que existem em subscription_plans mas não na lista fixa
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'photographer_site', sp.plan_code, true
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = 'photographer_site' AND mpa.plan_code = sp.plan_code
  );

SELECT module_type, plan_code, is_available
FROM module_plan_availability
WHERE module_type = 'photographer_site'
ORDER BY plan_code;
