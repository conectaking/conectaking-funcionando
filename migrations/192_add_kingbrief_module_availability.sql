-- ===========================================
-- Migration 192: KingBrief na Separação de Pacotes
-- Módulo kingbrief em module_plan_availability; ADM ativa nos planos desejados.
-- ===========================================

DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'premium', 'king_base', 'king_essential',
        'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal'
    ];
    plan_code_var TEXT;
    available BOOLEAN;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        -- Disponível a partir de premium (free/basic = false)
        available := (plan_code_var NOT IN ('free', 'basic'));

        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'kingbrief', plan_code_var, available
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'kingbrief' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'kingbrief', sp.plan_code, (sp.plan_code NOT IN ('free', 'basic'))
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = 'kingbrief' AND mpa.plan_code = sp.plan_code
  );

SELECT 'Migration 192: kingbrief adicionado à Separação de Pacotes.' AS status;
