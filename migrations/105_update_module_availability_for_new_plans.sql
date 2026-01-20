-- Migration: Atualizar disponibilidade de módulos para os novos planos
-- Data: 2026-01-19
-- Descrição: Configura disponibilidade de módulos para os novos planos (king_base, king_finance, king_finance_plus, king_premium_plus, king_corporate)

DO $$
DECLARE
    new_plan_codes TEXT[] := ARRAY['king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate'];
    all_modules TEXT[] := ARRAY[
        'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode',
        'facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 
        'spotify', 'linkedin', 'pinterest',
        'link', 'portfolio', 'banner', 'carousel', 
        'youtube_embed', 'sales_page', 'digital_form'
    ];
    premium_modules TEXT[] := ARRAY['finance', 'agenda', 'contract'];
    plan_code_var TEXT;
    module_type_var TEXT;
BEGIN
    -- Inserir todos os módulos padrão para todos os novos planos
    FOREACH module_type_var IN ARRAY all_modules
    LOOP
        FOREACH plan_code_var IN ARRAY new_plan_codes
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
    -- Apenas king_premium_plus tem acesso a esses módulos extras
    FOREACH module_type_var IN ARRAY premium_modules
    LOOP
        -- King Premium Plus: TEM acesso
        IF NOT EXISTS (
            SELECT 1 FROM module_plan_availability mpa
            WHERE mpa.module_type = module_type_var
            AND mpa.plan_code = 'king_premium_plus'
        ) THEN
            INSERT INTO module_plan_availability (module_type, plan_code, is_available)
            VALUES (module_type_var, 'king_premium_plus', true);
        ELSE
            -- Atualizar para garantir que está disponível
            UPDATE module_plan_availability
            SET is_available = true
            WHERE module_type = module_type_var
            AND plan_code = 'king_premium_plus';
        END IF;
        
        -- King Finance e King Finance Plus: TEM acesso apenas ao módulo finance
        IF module_type_var = 'finance' THEN
            -- King Finance
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability mpa
                WHERE mpa.module_type = 'finance'
                AND mpa.plan_code = 'king_finance'
            ) THEN
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES ('finance', 'king_finance', true);
            END IF;
            
            -- King Finance Plus
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability mpa
                WHERE mpa.module_type = 'finance'
                AND mpa.plan_code = 'king_finance_plus'
            ) THEN
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES ('finance', 'king_finance_plus', true);
            END IF;
        ELSE
            -- Agenda e Contract: NÃO disponíveis para king_finance e king_finance_plus
            -- Garantir que estão como false ou não existem
            UPDATE module_plan_availability
            SET is_available = false
            WHERE module_type = module_type_var
            AND plan_code IN ('king_finance', 'king_finance_plus');
            
            -- Se não existir, criar como false
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability mpa
                WHERE mpa.module_type = module_type_var
                AND mpa.plan_code IN ('king_finance', 'king_finance_plus')
            ) THEN
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES (module_type_var, 'king_finance', false),
                       (module_type_var, 'king_finance_plus', false);
            END IF;
        END IF;
        
        -- King Base e King Corporate: NÃO têm acesso aos módulos premium extras
        FOREACH plan_code_var IN ARRAY ARRAY['king_base', 'king_corporate']
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM module_plan_availability mpa
                WHERE mpa.module_type = module_type_var
                AND mpa.plan_code = plan_code_var
            ) THEN
                INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                VALUES (module_type_var, plan_code_var, false);
            ELSE
                UPDATE module_plan_availability
                SET is_available = false
                WHERE module_type = module_type_var
                AND plan_code = plan_code_var;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Disponibilidade de módulos atualizada para os novos planos com sucesso!';
END $$;

-- Verificar configuração
SELECT 
    plan_code,
    module_type,
    is_available
FROM module_plan_availability
WHERE plan_code IN ('king_base', 'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate')
AND module_type IN ('finance', 'agenda', 'contract')
ORDER BY plan_code, module_type;
