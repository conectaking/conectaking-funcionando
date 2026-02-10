-- ===========================================
-- Migration: Inserir convite em module_plan_availability
-- Descrição: Disponibiliza o módulo Convite Digital nos planos
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
        SELECT 'convite', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'convite' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

SELECT module_type, plan_code, is_available
FROM module_plan_availability
WHERE module_type = 'convite'
ORDER BY plan_code;
