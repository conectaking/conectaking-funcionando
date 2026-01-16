-- Migration 092: Adicionar coluna is_active_for_profile à tabela cadastro_links
-- Data: 2026-01-16
-- Descrição: Adiciona coluna para marcar qual link personalizado está ativo no cartão público

-- Adicionar coluna is_active_for_profile
ALTER TABLE cadastro_links 
ADD COLUMN IF NOT EXISTS is_active_for_profile BOOLEAN DEFAULT FALSE;

-- Criar índice para busca rápida de links ativos
CREATE INDEX IF NOT EXISTS idx_cadastro_links_is_active_for_profile 
ON cadastro_links(is_active_for_profile) 
WHERE is_active_for_profile = TRUE;

-- Comentário
COMMENT ON COLUMN cadastro_links.is_active_for_profile IS 'Indica se este link está ativo no cartão público (apenas um link por guest_list_item pode estar ativo)';

-- Verificação final
SELECT 'Migration 092 concluída com sucesso! Coluna is_active_for_profile adicionada à tabela cadastro_links.' AS status;
