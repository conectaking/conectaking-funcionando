-- Migration: Adicionar módulos Gestão Financeira, Agenda Inteligente e Contratos à disponibilidade
-- Data: 2026-01-19
-- Descrição: Adiciona os módulos finance, agenda e contract à tabela module_plan_availability

DO $$
DECLARE
    plan_codes TEXT[] := ARRAY['free', 'individual', 'individual_com_logo', 'business_owner'];
    module_types TEXT[] := ARRAY['finance', 'agenda', 'contract'];
    plan_code TEXT;
    module_type TEXT;
BEGIN
    -- Inserir disponibilidade para cada combinação de módulo e plano
    FOREACH module_type IN ARRAY module_types
    LOOP
        FOREACH plan_code IN ARRAY plan_codes
        LOOP
            -- Inserir apenas se não existir
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability mpa
                WHERE mpa.module_type = module_type
                AND mpa.plan_code = plan_code
            ) THEN
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES (
                    module_type,
                    plan_code,
                    CASE 
                        WHEN plan_code = 'free' THEN false  -- Free não tem acesso aos módulos premium
                        ELSE true  -- Outros planos têm acesso por padrão
                    END
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Módulos finance, agenda e contract adicionados à disponibilidade com sucesso!';
END $$;

-- Verificar módulos adicionados
SELECT 
    module_type,
    plan_code,
    is_available
FROM module_plan_availability
WHERE module_type IN ('finance', 'agenda', 'contract')
ORDER BY module_type, plan_code;
