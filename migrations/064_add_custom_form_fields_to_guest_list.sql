-- ===========================================
-- Migration: Adicionar campos customizados do KingForms na Lista de Convidados
-- Data: 2026-01-07
-- Descrição: Permite personalizar o formulário de inscrição com campos customizados
-- ===========================================

-- PARTE 1: Adicionar campo de campos customizados na guest_list_items
DO $$ 
BEGIN
    -- custom_form_fields: Campos customizados do formulário (similar ao KingForms)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'custom_form_fields') THEN
        ALTER TABLE guest_list_items ADD COLUMN custom_form_fields JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Campo custom_form_fields adicionado à tabela guest_list_items';
    END IF;
    
    -- use_custom_form: Se deve usar campos customizados ou campos padrão
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'use_custom_form') THEN
        ALTER TABLE guest_list_items ADD COLUMN use_custom_form BOOLEAN DEFAULT false;
        RAISE NOTICE 'Campo use_custom_form adicionado à tabela guest_list_items';
    END IF;
END $$;

-- PARTE 2: Adicionar campo para armazenar respostas customizadas nos guests
DO $$ 
BEGIN
    -- custom_responses: Respostas dos campos customizados (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'custom_responses') THEN
        ALTER TABLE guests ADD COLUMN custom_responses JSONB;
        RAISE NOTICE 'Campo custom_responses adicionado à tabela guests';
    END IF;
END $$;

-- PARTE 3: Criar índices para busca em campos customizados
CREATE INDEX IF NOT EXISTS idx_guest_list_items_custom_form ON guest_list_items(use_custom_form) WHERE use_custom_form = true;
CREATE INDEX IF NOT EXISTS idx_guests_custom_responses ON guests USING GIN(custom_responses);

-- PARTE 4: Comentários
COMMENT ON COLUMN guest_list_items.custom_form_fields IS 'Campos customizados do formulário em formato JSON (similar ao KingForms)';
COMMENT ON COLUMN guest_list_items.use_custom_form IS 'Se true, usa campos customizados; se false, usa campos padrão';
COMMENT ON COLUMN guests.custom_responses IS 'Respostas dos campos customizados em formato JSONB';

-- Verificação final
SELECT 'Migration 064 concluída com sucesso! Campos customizados adicionados.' AS status;
