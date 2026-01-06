-- ===========================================
-- Migration: Adicionar campo button_logo_url
-- Data: 2026-01-06
-- Descrição: Adiciona button_logo_url para permitir logo no modo botão do formulário
-- ===========================================

DO $$
BEGIN
    -- Adicionar button_logo_url (logo específico para o modo botão)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'button_logo_url'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN button_logo_url VARCHAR(500);
        
        RAISE NOTICE 'Coluna button_logo_url adicionada com sucesso à digital_form_items';
    ELSE
        RAISE NOTICE 'Coluna button_logo_url já existe em digital_form_items';
    END IF;

END $$;

COMMENT ON COLUMN digital_form_items.button_logo_url IS 'URL do logo específico para exibição no modo botão do formulário no cartão público';

