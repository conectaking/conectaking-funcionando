-- Migration: Plano ADM Principal (todos os módulos) + King Start SEM Gestão Financeira, Contratos e Agenda
-- 1) Cria plano ADM Principal para uso do administrador (todos os módulos ativos).
-- 2) Garante que King Start (basic) NÃO tenha finance, contract, agenda.
-- 3) Garante que King Finance, King Finance Plus e King Premium Plus TENHAM finance, contract, agenda.

-- ========== 1. Plano ADM Principal ==========
INSERT INTO subscription_plans (plan_code, plan_name, price, description, features, is_active)
VALUES (
    'adm_principal',
    'ADM Principal',
    0.00,
    'Plano exclusivo para administrador. Acesso a todos os módulos.',
    '{"can_add_all_modules": true, "can_edit_logo": true, "max_profiles": 999, "admin_plan": true}'::jsonb,
    true
)
ON CONFLICT (plan_code) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    is_active = true;

-- Inserir todos os módulos ativos para adm_principal
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT m.module_type, 'adm_principal', true
FROM (
    SELECT unnest(ARRAY[
        'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode',
        'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
        'spotify', 'linkedin', 'pinterest',
        'link', 'portfolio', 'banner', 'carousel',
        'youtube_embed', 'instagram_embed', 'sales_page', 'digital_form',
        'finance', 'agenda', 'contract', 'modo_empresa'
    ]) AS module_type
) m
ON CONFLICT (module_type, plan_code) DO UPDATE SET is_available = true;

-- ========== 2. King Start (basic): SEM Gestão Financeira, Contratos e Agenda ==========
UPDATE module_plan_availability
SET is_available = false
WHERE plan_code = 'basic'
  AND module_type IN ('finance', 'contract', 'agenda');

-- ========== 3. King Finance, King Finance Plus, King Premium Plus: COM finance, contract, agenda ==========
UPDATE module_plan_availability
SET is_available = true
WHERE plan_code IN ('king_finance', 'king_finance_plus', 'king_premium_plus')
  AND module_type IN ('finance', 'contract', 'agenda');

-- Inserir se não existir (para planos que ainda não tinham esses registros)
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT mt, pc, true
FROM unnest(ARRAY['finance', 'contract', 'agenda']) AS mt,
     unnest(ARRAY['king_finance', 'king_finance_plus', 'king_premium_plus']) AS pc
WHERE NOT EXISTS (
    SELECT 1 FROM module_plan_availability mpa
    WHERE mpa.module_type = mt AND mpa.plan_code = pc
)
ON CONFLICT (module_type, plan_code) DO UPDATE SET is_available = true;

-- Verificação
SELECT plan_code, module_type, is_available
FROM module_plan_availability
WHERE plan_code IN ('basic', 'premium', 'adm_principal', 'king_finance', 'king_finance_plus', 'king_premium_plus')
  AND module_type IN ('finance', 'contract', 'agenda')
ORDER BY plan_code, module_type;
