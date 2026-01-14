-- ===========================================
-- Migration: Adicionar campos de tema para portaria e confirmação
-- Data: 2026-01-14
-- Descrição: Adiciona campos theme_portaria e theme_confirmacao para personalização de temas
-- ===========================================

DO $$
BEGIN
    -- Adicionar theme_portaria (tema para página de portaria)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'theme_portaria'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN theme_portaria VARCHAR(50) DEFAULT 'default';
        
        COMMENT ON COLUMN guest_list_items.theme_portaria IS 'Tema pré-definido para a página de portaria (default, dark, light, premium, modern, etc)';
        
        RAISE NOTICE 'Coluna theme_portaria adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna theme_portaria já existe em guest_list_items.';
    END IF;

    -- Adicionar theme_confirmacao (tema para página de confirmação)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'theme_confirmacao'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN theme_confirmacao VARCHAR(50) DEFAULT 'default';
        
        COMMENT ON COLUMN guest_list_items.theme_confirmacao IS 'Tema pré-definido para a página de confirmação de presença (default, dark, light, premium, modern, etc)';
        
        RAISE NOTICE 'Coluna theme_confirmacao adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna theme_confirmacao já existe em guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 076 concluída com sucesso! Campos theme_portaria e theme_confirmacao adicionados à guest_list_items.' AS status;
