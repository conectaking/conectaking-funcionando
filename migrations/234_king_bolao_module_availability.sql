-- ===========================================
-- Migration 234: King Bolão na Separação de Pacotes
-- Módulo só aparece no sidebar; ADM ativa por plano ou por usuário individual.
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
        SELECT 'king_bolao', plan_code_var, false
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'king_bolao' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'king_bolao', sp.plan_code, false
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = 'king_bolao' AND mpa.plan_code = sp.plan_code
  );

SELECT 'Migration 234: king_bolao adicionado à Separação de Pacotes.' AS status;
