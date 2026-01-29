-- Migration: Adicionar módulo "Personalização da Marca" (branding) à Separação de Pacotes
-- Descrição: Adiciona o módulo 'branding' à tabela module_plan_availability para todos os planos
-- Data: 2026-01-31

-- Adicionar módulo 'branding' para todos os planos existentes
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
        -- Inserir apenas se não existir
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'branding', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability mpa
            WHERE mpa.module_type = 'branding'
            AND mpa.plan_code = plan_code_var
        );
    END LOOP;
    
    RAISE NOTICE 'Módulo branding adicionado à disponibilidade com sucesso!';
END $$;

-- Verificar módulos adicionados
SELECT 
    module_type,
    plan_code,
    is_available,
    updated_at
FROM module_plan_availability
WHERE module_type = 'branding'
ORDER BY plan_code;
