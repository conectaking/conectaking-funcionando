-- ===========================================
-- Migration 190: Recibos e Orçamentos na Separação de Pacotes
-- Módulo só aparece no painel (sidebar); não é item do cartão público.
-- Inserido com is_available = false; ADM ativa nos planos desejados.
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
        SELECT 'recibos_orcamentos', plan_code_var, false
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'recibos_orcamentos' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'recibos_orcamentos', sp.plan_code, false
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = 'recibos_orcamentos' AND mpa.plan_code = sp.plan_code
  );

SELECT 'Migration 190: recibos_orcamentos adicionado à Separação de Pacotes.' AS status;
