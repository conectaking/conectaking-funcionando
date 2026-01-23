-- ===========================================
-- Migration: Integrar Lista de Convidados no KingForms
-- Data: 2026-01-10
-- Descrição: Unifica o sistema de Lista de Convidados dentro do KingForms
-- ===========================================

-- PARTE 1: Adicionar campo para identificar se o formulário é lista de convidados
-- (Já existe guest_list_items, então vamos apenas garantir que a relação está correta)

-- PARTE 2: Criar índice para busca rápida de convidados por nome
DO $$ 
BEGIN
    -- Índice para busca por nome (case-insensitive)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guests_name_search') THEN
        CREATE INDEX idx_guests_name_search ON guests USING GIN (to_tsvector('portuguese', name));
        RAISE NOTICE 'Índice idx_guests_name_search criado';
    END IF;
    
    -- Índice para busca por status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guests_status_search') THEN
        CREATE INDEX idx_guests_status_search ON guests(status) WHERE status IN ('registered', 'confirmed', 'checked_in');
        RAISE NOTICE 'Índice idx_guests_status_search criado';
    END IF;
END $$;

-- PARTE 3: Comentários
COMMENT ON INDEX idx_guests_name_search IS 'Índice para busca rápida de convidados por nome';
COMMENT ON INDEX idx_guests_status_search IS 'Índice para busca rápida de convidados por status';

-- Verificação final
SELECT 'Migration 066 concluída com sucesso! Sistema de busca de convidados otimizado.' AS status;

