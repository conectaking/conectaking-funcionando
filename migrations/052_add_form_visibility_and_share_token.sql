-- Migration: Adicionar campos de visibilidade e link compartilhável para formulários
-- Data: 2025-01-06
-- Descrição: Permite ocultar formulários do cartão público mas manter acessível via link único

-- ============================================
-- PARTE 1: Adicionar campo is_listed (visível no cartão público)
-- ============================================
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT true;

-- Comentário da coluna
COMMENT ON COLUMN profile_items.is_listed IS 'Se true, o formulário aparece no cartão público. Se false, só é acessível via link único';

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_profile_items_is_listed ON profile_items(is_listed) WHERE item_type = 'digital_form';

-- ============================================
-- PARTE 2: Adicionar campo share_token (link único)
-- ============================================
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE;

-- Comentário da coluna
COMMENT ON COLUMN profile_items.share_token IS 'Token único para acesso ao formulário via link compartilhável';

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_profile_items_share_token ON profile_items(share_token) WHERE share_token IS NOT NULL;

-- ============================================
-- PARTE 3: Atualizar formulários existentes
-- ============================================
-- Todos os formulários existentes ficam visíveis no cartão por padrão
UPDATE profile_items 
SET is_listed = true 
WHERE item_type = 'digital_form' AND is_listed IS NULL;

-- ============================================
-- PARTE 4: Criar função para gerar token único
-- ============================================
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
DECLARE
    token VARCHAR(255);
    exists_token BOOLEAN;
BEGIN
    LOOP
        -- Gerar token aleatório de 32 caracteres
        token := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 32));
        
        -- Verificar se já existe
        SELECT EXISTS(SELECT 1 FROM profile_items WHERE share_token = token) INTO exists_token;
        
        -- Se não existe, usar este token
        EXIT WHEN NOT exists_token;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION generate_share_token() IS 'Gera um token único de 32 caracteres para compartilhamento de formulários';

