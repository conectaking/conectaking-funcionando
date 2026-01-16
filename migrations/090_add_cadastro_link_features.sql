-- Migration 090: Adicionar funcionalidades de link único ao link de cadastro
-- Data: 2026-01-16
-- Descrição: Adiciona campos de descrição, validade e limite de usos ao link de cadastro (cadastro_slug)

DO $$ 
BEGIN
    -- Adicionar coluna cadastro_description (descrição opcional)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'cadastro_description'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN cadastro_description VARCHAR(255);
        
        COMMENT ON COLUMN guest_list_items.cadastro_description IS 'Descrição opcional para o link de cadastro';
        
        RAISE NOTICE 'Coluna cadastro_description adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna cadastro_description já existe na guest_list_items.';
    END IF;

    -- Adicionar coluna cadastro_expires_at (validade do link)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'cadastro_expires_at'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN cadastro_expires_at TIMESTAMP NULL;
        
        COMMENT ON COLUMN guest_list_items.cadastro_expires_at IS 'Data de expiração do link de cadastro. NULL = sem expiração';
        
        CREATE INDEX IF NOT EXISTS idx_guest_list_items_cadastro_expires_at ON guest_list_items(cadastro_expires_at);
        
        RAISE NOTICE 'Coluna cadastro_expires_at adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna cadastro_expires_at já existe na guest_list_items.';
    END IF;

    -- Adicionar coluna cadastro_max_uses (limite de usos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'cadastro_max_uses'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN cadastro_max_uses INTEGER DEFAULT 999999;
        
        COMMENT ON COLUMN guest_list_items.cadastro_max_uses IS 'Número máximo de vezes que o link de cadastro pode ser usado. 999999 = ilimitado';
        
        RAISE NOTICE 'Coluna cadastro_max_uses adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna cadastro_max_uses já existe na guest_list_items.';
    END IF;

    -- Adicionar coluna cadastro_current_uses (contador de usos atuais)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'cadastro_current_uses'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN cadastro_current_uses INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN guest_list_items.cadastro_current_uses IS 'Número atual de vezes que o link de cadastro foi usado';
        
        RAISE NOTICE 'Coluna cadastro_current_uses adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna cadastro_current_uses já existe na guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 090 concluída com sucesso! Campos de funcionalidades adicionados ao link de cadastro.' AS status;
