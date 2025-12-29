-- ===========================================
-- Migration: Verificar e garantir campos de todos os módulos
-- Data: 2025-01-31
-- Descrição: Garante que todos os campos necessários para os módulos existam na tabela profile_items
-- ===========================================

DO $$ 
BEGIN
    -- Verificar e adicionar coluna image_url se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Coluna image_url adicionada';
    END IF;

    -- Verificar e adicionar coluna icon_class se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'icon_class'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN icon_class VARCHAR(100);
        RAISE NOTICE 'Coluna icon_class adicionada';
    END IF;

    -- Verificar e adicionar coluna pix_key se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pix_key'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN pix_key VARCHAR(255);
        RAISE NOTICE 'Coluna pix_key adicionada';
    END IF;

    -- Verificar e adicionar coluna recipient_name se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'recipient_name'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN recipient_name VARCHAR(255);
        RAISE NOTICE 'Coluna recipient_name adicionada';
    END IF;

    -- Verificar e adicionar coluna pix_amount se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pix_amount'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN pix_amount DECIMAL(10,2);
        RAISE NOTICE 'Coluna pix_amount adicionada';
    END IF;

    -- Verificar e adicionar coluna pix_description se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pix_description'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN pix_description TEXT;
        RAISE NOTICE 'Coluna pix_description adicionada';
    END IF;

    -- Verificar e adicionar coluna pdf_url se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'pdf_url'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN pdf_url TEXT;
        RAISE NOTICE 'Coluna pdf_url adicionada';
    END IF;

    -- Verificar e adicionar coluna logo_size se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'logo_size'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN logo_size INTEGER;
        RAISE NOTICE 'Coluna logo_size adicionada';
    END IF;

    -- Verificar e adicionar coluna aspect_ratio se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'aspect_ratio'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN aspect_ratio VARCHAR(50);
        RAISE NOTICE 'Coluna aspect_ratio adicionada';
    END IF;

    -- Verificar e adicionar coluna whatsapp_message se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'whatsapp_message'
    ) THEN
        ALTER TABLE profile_items ADD COLUMN whatsapp_message TEXT;
        RAISE NOTICE 'Coluna whatsapp_message adicionada';
    END IF;

END $$;

-- Verificar quais colunas existem após a migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name IN (
    'image_url', 
    'icon_class', 
    'pix_key', 
    'recipient_name', 
    'pix_amount', 
    'pix_description', 
    'pdf_url', 
    'logo_size', 
    'aspect_ratio',
    'whatsapp_message'
)
ORDER BY column_name;

