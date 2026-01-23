-- ===========================================
-- Migration: Adicionar digital_form à module_plan_availability
-- Data: 2026-01-05
-- Descrição: Adiciona o módulo 'digital_form' à tabela module_plan_availability para todos os planos
-- ===========================================

-- Adicionar digital_form para todos os planos (free, individual, individual_com_logo, business_owner)
-- Se já existir, não faz nada (ON CONFLICT DO NOTHING)

INSERT INTO module_plan_availability (module_type, plan_code, is_available)
VALUES 
    ('digital_form', 'free', true),
    ('digital_form', 'individual', true),
    ('digital_form', 'individual_com_logo', true),
    ('digital_form', 'business_owner', true)
ON CONFLICT (module_type, plan_code) DO NOTHING;

COMMENT ON COLUMN module_plan_availability.module_type IS 'Tipo do módulo (whatsapp, instagram, youtube, digital_form, etc.)';

