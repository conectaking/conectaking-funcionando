-- ===========================================
-- Migration 251: Cartão Virtual na Separação de Pacotes
-- Data: 2026-09-27
-- Descrição: Permite que o ADM ative ou desative o módulo Cartão Virtual por plano/pacote
--            (igual ao King Selection, King Forms e Gestão Financeira)
-- ===========================================

DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'individual', 'individual_com_logo', 'premium',
        'king_base', 'king_essential', 'king_start', 'king_prime',
        'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal', 'enterprise'
    ];
    plan_code_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'cartao_virtual', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'cartao_virtual' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'cartao_virtual', sp.plan_code, true
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = 'cartao_virtual' AND mpa.plan_code = sp.plan_code
  );

SELECT 'Migration 251: cartao_virtual adicionado à Separação de Pacotes.' AS status;
