-- Migration: Tornar o módulo "Instagram Incorporado" visível para todas as contas
-- Data: 2026-01-26
-- Descrição: Insere instagram_embed na module_plan_availability para todos os planos
--            com is_available = true, para que o módulo apareça ao adicionar itens.
--            Depois o admin pode ajustar por plano se quiser.

DO $$
DECLARE
    plan_record RECORD;
BEGIN
    FOR plan_record IN
        SELECT DISTINCT plan_code FROM module_plan_availability
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'instagram_embed' AND plan_code = plan_record.plan_code
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES ('instagram_embed', plan_record.plan_code, true);
            RAISE NOTICE 'Inserido instagram_embed para plano: %', plan_record.plan_code;
        ELSE
            UPDATE module_plan_availability
            SET is_available = true
            WHERE module_type = 'instagram_embed' AND plan_code = plan_record.plan_code;
            RAISE NOTICE 'Atualizado instagram_embed (is_available=true) para plano: %', plan_record.plan_code;
        END IF;
    END LOOP;

    -- Garantir para planos que existem em subscription_plans mas talvez não em module_plan_availability
    FOR plan_record IN
        SELECT plan_code FROM subscription_plans WHERE is_active = true
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'instagram_embed' AND plan_code = plan_record.plan_code
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES ('instagram_embed', plan_record.plan_code, true);
            RAISE NOTICE 'Inserido instagram_embed para plano (subscription_plans): %', plan_record.plan_code;
        END IF;
    END LOOP;

    RAISE NOTICE 'Instagram Incorporado configurado para aparecer em todos os planos.';
END $$;
