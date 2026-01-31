-- ===========================================
-- Migration: Inserir king_selection em module_plan_availability
-- Data: 2026-01-31
-- Descrição: Cria registros por plano para o módulo KingSelection
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
        -- Por padrão: disponível do premium pra cima (free/basic = false)
        available := (plan_code_var NOT IN ('free', 'basic'));

        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'king_selection', plan_code_var, available
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'king_selection' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

-- Verificação
SELECT module_type, plan_code, is_available
FROM module_plan_availability
WHERE module_type = 'king_selection'
ORDER BY plan_code;

