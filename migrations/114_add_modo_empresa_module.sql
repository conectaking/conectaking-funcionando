-- Migration: Adicionar módulo "Modo Empresa" à module_plan_availability
-- Data: 2026-01-23
-- Descrição: Permite ativar Modo Empresa por plano na separação de pacotes (edição de planos).
--            king_corporate começa com modo_empresa ativo; demais planos false (admin pode ativar).

DO $$
DECLARE
    plan_record RECORD;
BEGIN
    FOR plan_record IN 
        SELECT plan_code FROM subscription_plans WHERE is_active = true
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability 
            WHERE module_type = 'modo_empresa' AND plan_code = plan_record.plan_code
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES (
                'modo_empresa',
                plan_record.plan_code,
                plan_record.plan_code IN ('king_corporate', 'business_owner', 'enterprise')
            )
            ON CONFLICT (module_type, plan_code) DO UPDATE
            SET is_available = EXCLUDED.is_available;
            RAISE NOTICE 'modo_empresa para %: %', plan_record.plan_code,
                plan_record.plan_code IN ('king_corporate', 'business_owner', 'enterprise');
        END IF;
    END LOOP;
END $$;
