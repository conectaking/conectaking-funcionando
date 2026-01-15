-- ===========================================
-- Migration: Criar tabela de Links Únicos para Formulários
-- Data: 2026-01-15
-- Descrição: Sistema de links únicos com expiração e limite de uso por pessoa
-- ===========================================

-- PASSO 1: Criar tabela unique_form_links
CREATE TABLE IF NOT EXISTS unique_form_links (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    
    -- Token único do link
    token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Descrição/nome do link (opcional)
    description VARCHAR(255),
    
    -- Datas
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    
    -- Status do link
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'deactivated')),
    
    -- Limites de uso
    max_uses INTEGER DEFAULT 1 NOT NULL, -- 1 = uma pessoa só
    current_uses INTEGER DEFAULT 0 NOT NULL,
    
    -- Informação de quem usou (se max_uses = 1)
    guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
    
    -- Metadados adicionais
    created_by_user_id INTEGER,
    notes TEXT,
    
    -- Foreign key
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- PASSO 2: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_unique_form_links_token ON unique_form_links(token);
CREATE INDEX IF NOT EXISTS idx_unique_form_links_profile_item ON unique_form_links(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_unique_form_links_status ON unique_form_links(status);
CREATE INDEX IF NOT EXISTS idx_unique_form_links_expires_at ON unique_form_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_unique_form_links_guest_id ON unique_form_links(guest_id);

-- PASSO 3: Comentários
COMMENT ON TABLE unique_form_links IS 'Armazena links únicos para formulários com expiração e limite de uso';
COMMENT ON COLUMN unique_form_links.token IS 'Token único do link (ex: unique_abc123xyz)';
COMMENT ON COLUMN unique_form_links.max_uses IS 'Número máximo de vezes que o link pode ser usado (1 = uma pessoa só)';
COMMENT ON COLUMN unique_form_links.current_uses IS 'Número de vezes que o link já foi usado';
COMMENT ON COLUMN unique_form_links.status IS 'Status: active (disponível), used (já usado), expired (expirado), deactivated (desativado)';
COMMENT ON COLUMN unique_form_links.guest_id IS 'ID do convidado que usou o link (se max_uses = 1)';
COMMENT ON COLUMN unique_form_links.expires_at IS 'Data e hora de expiração do link';

-- PASSO 4: Função para marcar link como usado
CREATE OR REPLACE FUNCTION mark_unique_link_as_used(
    p_token VARCHAR(255),
    p_guest_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_uses INTEGER;
    v_current_uses INTEGER;
    v_status VARCHAR(20);
BEGIN
    -- Buscar informações do link
    SELECT max_uses, current_uses, status
    INTO v_max_uses, v_current_uses, v_status
    FROM unique_form_links
    WHERE token = p_token;
    
    -- Verificar se o link existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Link não encontrado';
    END IF;
    
    -- Verificar se o link já foi usado
    IF v_status = 'used' OR v_current_uses >= v_max_uses THEN
        RETURN FALSE;
    END IF;
    
    -- Marcar como usado
    UPDATE unique_form_links
    SET 
        current_uses = current_uses + 1,
        used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END,
        status = CASE 
            WHEN (current_uses + 1) >= max_uses THEN 'used'
            ELSE status
        END,
        guest_id = CASE 
            WHEN p_guest_id IS NOT NULL AND guest_id IS NULL THEN p_guest_id
            ELSE guest_id
        END
    WHERE token = p_token;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: Função para verificar validade do link
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
        -- Marcar como expirado se necessário
        IF v_status = 'active' AND NOW() > v_expires_at THEN
            UPDATE unique_form_links SET status = 'expired' WHERE token = p_token;
        END IF;
        RETURN FALSE;
    END IF;
    
    -- Verificar se expirou
    IF NOW() > v_expires_at THEN
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

-- PASSO 6: Trigger para atualizar status automaticamente (opcional - pode ser feito via cron job também)
CREATE OR REPLACE FUNCTION check_unique_link_expiration()
RETURNS void AS $$
BEGIN
    UPDATE unique_form_links
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Verificação final
SELECT 'Migration 084 concluída com sucesso! Tabela unique_form_links criada.' AS status;
