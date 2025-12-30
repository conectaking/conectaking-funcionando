-- Migration: Adicionar individual_com_logo ao account_type e criar tabela de disponibilidade de módulos
-- Data: 2025-01-31
-- Descrição: Adiciona novo tipo de conta e sistema de controle de módulos por plano

-- ============================================
-- PARTE 1: Adicionar 'individual_com_logo' ao CHECK constraint de account_type
-- ============================================

-- Primeiro, verificar se a constraint existe e qual é o nome dela
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar nome da constraint
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%account_type%';
    
    IF constraint_name IS NOT NULL THEN
        -- Remover constraint antiga
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint % removida', constraint_name;
    END IF;
END $$;

-- Criar nova constraint com individual_com_logo
ALTER TABLE users 
ADD CONSTRAINT users_account_type_check 
CHECK (account_type IN ('free', 'individual', 'individual_com_logo', 'business_owner', 'team_member'));

-- ============================================
-- PARTE 2: Criar tabela de disponibilidade de módulos por plano
-- ============================================

CREATE TABLE IF NOT EXISTS module_plan_availability (
    id SERIAL PRIMARY KEY,
    module_type VARCHAR(100) NOT NULL, -- Tipo do módulo (whatsapp, instagram, youtube, etc.)
    plan_code VARCHAR(50) NOT NULL, -- Código do plano: 'free', 'individual', 'individual_com_logo', 'business_owner'
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_type, plan_code)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_module_plan_availability_module ON module_plan_availability(module_type);
CREATE INDEX IF NOT EXISTS idx_module_plan_availability_plan ON module_plan_availability(plan_code);
CREATE INDEX IF NOT EXISTS idx_module_plan_availability_available ON module_plan_availability(is_available);

-- Inserir disponibilidade padrão para todos os módulos em todos os planos (todos disponíveis por padrão)
-- Isso permite que o ADM configure depois quais módulos ficam em quais planos
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT DISTINCT 
    item_type::VARCHAR as module_type,
    plan_code,
    true as is_available
FROM (
    SELECT unnest(ARRAY[
        'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode',
        'facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 
        'spotify', 'linkedin', 'pinterest', 'reddit', 'twitch',
        'link', 'portfolio', 'banner', 'banner_carousel', 'carousel', 'pdf', 
        'pdf_embed', 'youtube_embed', 'instagram_embed', 'tiktok_embed',
        'spotify_embed', 'linkedin_embed', 'pinterest_embed',
        'sales_page', 'product_catalog'
    ]) as item_type
) modules
CROSS JOIN (
    SELECT unnest(ARRAY['free', 'individual', 'individual_com_logo', 'business_owner']) as plan_code
) plans
ON CONFLICT (module_type, plan_code) DO NOTHING;

-- Verificação (só executa se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_plan_availability') THEN
        RAISE NOTICE 'Tabela module_plan_availability criada com sucesso!';
    ELSE
        RAISE WARNING 'Tabela module_plan_availability não foi criada. Verifique os erros acima.';
    END IF;
END $$;

-- Verificação final (descomente após executar a migration completa)
-- SELECT 
--     module_type,
--     plan_code,
--     is_available
-- FROM module_plan_availability
-- ORDER BY module_type, plan_code;

