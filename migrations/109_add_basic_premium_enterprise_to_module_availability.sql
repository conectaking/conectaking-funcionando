-- Migration: Adicionar módulos para planos basic, premium e enterprise
-- Data: 2026-01-23
-- Descrição: Garante que os planos basic, premium e enterprise tenham módulos configurados na tabela module_plan_availability

DO $$
DECLARE
    plan_codes TEXT[] := ARRAY['basic', 'premium', 'enterprise'];
    all_modules TEXT[] := ARRAY[
        'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode',
        'facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 
        'spotify', 'linkedin', 'pinterest',
        'link', 'portfolio', 'banner', 'carousel', 
        'youtube_embed', 'sales_page', 'digital_form',
        'finance', 'agenda', 'contract'
    ];
    premium_modules TEXT[] := ARRAY['finance', 'agenda', 'contract'];
    plan_code_var TEXT;
    module_type_var TEXT;
BEGIN
    -- Inserir todos os módulos padrão para basic, premium e enterprise
    FOREACH module_type_var IN ARRAY all_modules
    LOOP
        FOREACH plan_code_var IN ARRAY plan_codes
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability mpa
                WHERE mpa.module_type = module_type_var
                AND mpa.plan_code = plan_code_var
            ) THEN
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES (module_type_var, plan_code_var, true);
            END IF;
        END LOOP;
    END LOOP;
    
    -- Configurar módulos premium (finance, agenda, contract)
    FOREACH module_type_var IN ARRAY premium_modules
    LOOP
        -- Basic: NÃO tem acesso aos módulos premium
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability mpa
            WHERE mpa.module_type = module_type_var
            AND mpa.plan_code = 'basic'
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES (module_type_var, 'basic', false);
        ELSE
            UPDATE module_plan_availability
            SET is_available = false
            WHERE module_type = module_type_var
            AND plan_code = 'basic';
        END IF;
        
        -- Premium: TEM acesso aos módulos premium
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability mpa
            WHERE mpa.module_type = module_type_var
            AND mpa.plan_code = 'premium'
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES (module_type_var, 'premium', true);
        ELSE
            UPDATE module_plan_availability
            SET is_available = true
            WHERE module_type = module_type_var
            AND plan_code = 'premium';
        END IF;
        
        -- Enterprise: TEM acesso aos módulos premium
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability mpa
            WHERE mpa.module_type = module_type_var
            AND mpa.plan_code = 'enterprise'
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES (module_type_var, 'enterprise', true);
        ELSE
            UPDATE module_plan_availability
            SET is_available = true
            WHERE module_type = module_type_var
            AND plan_code = 'enterprise';
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Módulos configurados para basic, premium e enterprise com sucesso!';
END $$;

-- Verificar configuração
SELECT 
    plan_code,
    COUNT(*) as total_modulos,
    COUNT(CASE WHEN is_available = true THEN 1 END) as modulos_disponiveis,
    COUNT(CASE WHEN is_available = false THEN 1 END) as modulos_indisponiveis
FROM module_plan_availability
WHERE plan_code IN ('basic', 'premium', 'enterprise')
GROUP BY plan_code
ORDER BY plan_code;
