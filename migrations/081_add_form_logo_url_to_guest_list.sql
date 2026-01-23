-- ===========================================
-- Migration: Adicionar campo form_logo_url à guest_list_items
-- Data: 2026-01-15
-- Descrição: Adiciona form_logo_url para permitir logo na personalização da portaria
-- ===========================================

DO $$ 
BEGIN
    -- Adicionar form_logo_url (logo do formulário)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'form_logo_url'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN form_logo_url TEXT;
        
        RAISE NOTICE 'Coluna form_logo_url adicionada com sucesso à guest_list_items';
    ELSE
        RAISE NOTICE 'Coluna form_logo_url já existe em guest_list_items';
    END IF;

END $$;

COMMENT ON COLUMN guest_list_items.form_logo_url IS 'URL do logo do formulário para personalização da portaria';
