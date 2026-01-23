-- Migration: Garantir que todos os planos tenham registros na tabela module_plan_availability
-- Data: 2026-01-23
-- Descrição: Cria registros na tabela module_plan_availability para todos os planos ativos e todos os módulos principais
--            Isso garante que os módulos incluídos e não incluídos possam ser salvos corretamente

-- Lista de módulos principais que devem estar disponíveis para edição
DO $$
DECLARE
    plan_record RECORD;
    module_type_var TEXT;
    module_types TEXT[] := ARRAY[
        'carousel',      -- Carrossel
        'sales_page',    -- Loja Virtual
        'digital_form',  -- King Forms
        'portfolio',     -- Portfólio
        'banner',        -- Banner
        'finance',       -- Gestão Financeira
        'contract',      -- Contratos
        'agenda'         -- Agenda Inteligente
    ];
BEGIN
    -- Para cada plano ativo
    FOR plan_record IN 
        SELECT plan_code FROM subscription_plans WHERE is_active = true
    LOOP
        RAISE NOTICE 'Processando plano: %', plan_record.plan_code;
        
        -- Para cada tipo de módulo
        FOREACH module_type_var IN ARRAY module_types
        LOOP
            -- Verificar se o registro já existe
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability 
                WHERE module_type = module_type_var 
                AND plan_code = plan_record.plan_code
            ) THEN
                -- Criar registro com is_available = false por padrão (será atualizado quando o admin editar)
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES (module_type_var, plan_record.plan_code, false)
                ON CONFLICT (module_type, plan_code) DO NOTHING;
                
                RAISE NOTICE '  Criado registro: % para %', module_type_var, plan_record.plan_code;
            ELSE
                RAISE NOTICE '  Registro já existe: % para %', module_type_var, plan_record.plan_code;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Migration concluída!';
END $$;

-- Verificar resultados
SELECT 
    mpa.plan_code,
    sp.plan_name,
    COUNT(*) as total_modules,
    COUNT(CASE WHEN mpa.is_available = true THEN 1 END) as available_modules,
    COUNT(CASE WHEN mpa.is_available = false THEN 1 END) as unavailable_modules
FROM module_plan_availability mpa
INNER JOIN subscription_plans sp ON mpa.plan_code = sp.plan_code
WHERE sp.is_active = true
GROUP BY mpa.plan_code, sp.plan_name
ORDER BY sp.plan_name;
