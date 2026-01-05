-- ===========================================
-- Migration: Adicionar campos de personalização ao Formulário King
-- Data: 2026-01-05
-- Descrição: Adiciona header_image e background_image para personalização visual
-- ===========================================

DO $$
BEGIN
    -- Adicionar header_image_url (foto de abertura/evento)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'header_image_url'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN header_image_url TEXT;
        
        RAISE NOTICE 'Coluna header_image_url adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna header_image_url já existe';
    END IF;

    -- Adicionar background_image_url (foto de fundo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'background_image_url'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN background_image_url TEXT;
        
        RAISE NOTICE 'Coluna background_image_url adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna background_image_url já existe';
    END IF;

    -- Adicionar background_opacity (opacidade do fundo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'background_opacity'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN background_opacity DECIMAL(3,2) DEFAULT 1.0 
        CHECK (background_opacity >= 0 AND background_opacity <= 1);
        
        RAISE NOTICE 'Coluna background_opacity adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna background_opacity já existe';
    END IF;

END $$;

COMMENT ON COLUMN digital_form_items.header_image_url IS 'URL da imagem de cabeçalho/abertura do formulário (opcional)';
COMMENT ON COLUMN digital_form_items.background_image_url IS 'URL da imagem de fundo do formulário (opcional)';
COMMENT ON COLUMN digital_form_items.background_opacity IS 'Opacidade da imagem de fundo (0.0 a 1.0)';

