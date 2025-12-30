-- Migration: Adicionar individual_com_logo ao account_type e criar tabela de disponibilidade de módulos
-- Data: 2025-01-31
-- Descrição: Adiciona novo tipo de conta e sistema de controle de módulos por plano

-- ============================================
-- PARTE 1: Adicionar 'individual_com_logo' ao ENUM account_type_enum
-- ============================================

-- Adicionar valor ao ENUM se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'individual_com_logo' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'individual_com_logo';
        RAISE NOTICE 'Valor individual_com_logo adicionado ao account_type_enum com sucesso!';
    ELSE
        RAISE NOTICE 'Valor individual_com_logo já existe no account_type_enum.';
    END IF;
END $$;

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

-- ============================================
-- VERIFICAÇÃO FINAL - Execute esta query para confirmar que tudo foi criado
-- ============================================

-- Verificar se a tabela existe e mostrar alguns dados
SELECT 
    '✅ Migration executada com sucesso!' as status,
    COUNT(*) as total_registros,
    COUNT(DISTINCT module_type) as total_modulos,
    COUNT(DISTINCT plan_code) as total_planos
FROM module_plan_availability;

-- Mostrar alguns registros de exemplo
SELECT 
    module_type,
    plan_code,
    is_available
FROM module_plan_availability
ORDER BY module_type, plan_code
LIMIT 10;

