-- ===========================================
-- Migration: Permitir expires_at NULL na tabela unique_form_links
-- Data: 2026-01-16
-- Descrição: Permite links únicos sem expiração (expira apenas quando excluídos)
-- ===========================================

DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'unique_form_links'
    ) THEN
        -- Verificar se a coluna expires_at já permite NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
            AND column_name = 'expires_at'
            AND is_nullable = 'NO'
        ) THEN
            -- Alterar coluna para permitir NULL
            ALTER TABLE unique_form_links 
            ALTER COLUMN expires_at DROP NOT NULL;
            
            RAISE NOTICE 'Coluna expires_at agora permite NULL - links podem ser criados sem expiração!';
        ELSE
            RAISE NOTICE 'Coluna expires_at já permite NULL.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela unique_form_links não existe. Execute a migration 084 primeiro.';
    END IF;
END $$;

-- Atualizar função is_unique_link_valid para tratar expires_at NULL
CREATE OR REPLACE FUNCTION is_unique_link_valid(
    p_token VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(20);
    v_expires_at TIMESTAMP;
    v_current_uses INTEGER;
    v_max_uses INTEGER;
BEGIN
    -- Buscar informações do link
    SELECT status, expires_at, current_uses, max_uses
    INTO v_status, v_expires_at, v_current_uses, v_max_uses
    FROM unique_form_links
    WHERE token = p_token;
    
    -- Verificar se o link existe
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se está ativo
    IF v_status != 'active' THEN
        -- Marcar como expirado se necessário (apenas se expires_at não for NULL)
        IF v_expires_at IS NOT NULL AND v_status = 'active' AND NOW() > v_expires_at THEN
            UPDATE unique_form_links SET status = 'expired' WHERE token = p_token;
        END IF;
        RETURN FALSE;
    END IF;
    
    -- Verificar se expirou (apenas se expires_at não for NULL)
    IF v_expires_at IS NOT NULL AND NOW() > v_expires_at THEN
        UPDATE unique_form_links SET status = 'expired' WHERE token = p_token;
        RETURN FALSE;
    END IF;
    
    -- Verificar se já foi usado completamente
    IF v_current_uses >= v_max_uses THEN
        UPDATE unique_form_links SET status = 'used' WHERE token = p_token;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Verificação final
SELECT 'Migration 089 concluída! Links únicos agora podem ser criados sem expiração.' AS status;
