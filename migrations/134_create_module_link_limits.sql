-- Migration: Criar tabela module_link_limits para controle de quantidade de links por módulo e plano
-- Descrição: Sistema isolado para limitar quantidade de links por tipo de módulo em cada plano
-- Data: 2026-01-28

-- Criar tabela de limites de links
CREATE TABLE IF NOT EXISTS module_link_limits (
    id SERIAL PRIMARY KEY,
    module_type VARCHAR(50) NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    max_links INTEGER CHECK (max_links IS NULL OR max_links >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_type, plan_code)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_module_link_limits_module_plan ON module_link_limits(module_type, plan_code);
CREATE INDEX IF NOT EXISTS idx_module_link_limits_plan ON module_link_limits(plan_code);
CREATE INDEX IF NOT EXISTS idx_module_link_limits_module ON module_link_limits(module_type);

-- Comentários para documentação
COMMENT ON TABLE module_link_limits IS 'Armazena limites de quantidade de links por tipo de módulo e plano';
COMMENT ON COLUMN module_link_limits.module_type IS 'Tipo do módulo (banner, whatsapp, instagram, etc.)';
COMMENT ON COLUMN module_link_limits.plan_code IS 'Código do plano (basic, premium, king_prime, etc.)';
COMMENT ON COLUMN module_link_limits.max_links IS 'Quantidade máxima permitida (NULL = ilimitado)';

-- Inserir valores padrão (NULL = ilimitado para todos)
-- Todos os módulos começam sem limite para todos os planos
DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'premium', 'king_base', 'king_essential',
        'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal'
    ];
    module_types TEXT[] := ARRAY[
        'banner', 'whatsapp', 'instagram', 'telegram', 'email',
        'facebook', 'youtube', 'tiktok', 'twitter', 'spotify',
        'linkedin', 'pinterest', 'link', 'portfolio', 'carousel',
        'youtube_embed', 'instagram_embed', 'sales_page', 'digital_form',
        'pix', 'pix_qrcode'
    ];
    plan_code_var TEXT;
    module_type_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        FOREACH module_type_var IN ARRAY module_types
        LOOP
            -- Inserir apenas se não existir (NULL = ilimitado)
            INSERT INTO module_link_limits (module_type, plan_code, max_links)
            SELECT module_type_var, plan_code_var, NULL
            WHERE NOT EXISTS (
                SELECT 1 FROM module_link_limits mll
                WHERE mll.module_type = module_type_var
                AND mll.plan_code = plan_code_var
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Limites de links inicializados com sucesso! Todos os módulos começam ilimitados (NULL).';
END $$;

-- Verificar tabela criada
SELECT 
    COUNT(*) as total_limits,
    COUNT(DISTINCT module_type) as total_modules,
    COUNT(DISTINCT plan_code) as total_plans
FROM module_link_limits;
