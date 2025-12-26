-- ===========================================
-- Migration: Adicionar colunas que ainda faltam em profile_items
-- Data: 2025-12-26
-- Descrição: Adiciona recipient_name, pix_amount e pix_description que ainda não existem
-- ===========================================

DO $$ 
BEGIN
    -- Adicionar coluna recipient_name se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'recipient_name'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN recipient_name VARCHAR(255);
        RAISE NOTICE '✅ Coluna recipient_name adicionada com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna recipient_name já existe';
    END IF;

    -- Adicionar coluna pix_amount se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pix_amount'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN pix_amount DECIMAL(10,2);
        RAISE NOTICE '✅ Coluna pix_amount adicionada com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna pix_amount já existe';
    END IF;

    -- Adicionar coluna pix_description se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pix_description'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN pix_description TEXT;
        RAISE NOTICE '✅ Coluna pix_description adicionada com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna pix_description já existe';
    END IF;

END $$;

-- Verificar todas as colunas relacionadas
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name IN ('image_url', 'icon_class', 'pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'logo_size', 'aspect_ratio')
ORDER BY column_name;

