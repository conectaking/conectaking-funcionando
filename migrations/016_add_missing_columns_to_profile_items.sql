-- ===========================================
-- Migration: Adicionar colunas faltantes à tabela profile_items
-- Data: 2025-12-26
-- Descrição: Adiciona colunas necessárias para funcionalidades completas dos módulos
-- ===========================================

DO $$ 
BEGIN
    -- Adicionar coluna image_url se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Coluna image_url adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna image_url já existe';
    END IF;

    -- Adicionar coluna icon_class se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'icon_class'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN icon_class VARCHAR(100);
        RAISE NOTICE 'Coluna icon_class adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna icon_class já existe';
    END IF;

    -- Adicionar coluna pix_key se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pix_key'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN pix_key VARCHAR(255);
        RAISE NOTICE 'Coluna pix_key adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna pix_key já existe';
    END IF;

    -- Adicionar coluna recipient_name se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'recipient_name'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN recipient_name VARCHAR(255);
        RAISE NOTICE 'Coluna recipient_name adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna recipient_name já existe';
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
        RAISE NOTICE 'Coluna pix_amount adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna pix_amount já existe';
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
        RAISE NOTICE 'Coluna pix_description adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna pix_description já existe';
    END IF;

    -- Adicionar coluna pdf_url se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pdf_url'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN pdf_url TEXT;
        RAISE NOTICE 'Coluna pdf_url adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna pdf_url já existe';
    END IF;

    -- Adicionar coluna logo_size se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'logo_size'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN logo_size INTEGER;
        RAISE NOTICE 'Coluna logo_size adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna logo_size já existe';
    END IF;

    -- Adicionar coluna aspect_ratio se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'aspect_ratio'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN aspect_ratio VARCHAR(50);
        RAISE NOTICE 'Coluna aspect_ratio adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna aspect_ratio já existe';
    END IF;

END $$;

-- Verificar quais colunas foram adicionadas
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name IN ('image_url', 'icon_class', 'pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url', 'logo_size', 'aspect_ratio')
ORDER BY column_name;

