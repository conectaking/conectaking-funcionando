-- ===========================================
-- Migration: header_banner_fit (apenas portaria)
-- Descrição: Opção de enquadramento do banner na portaria.
--            'cover' = preencher (pode cortar) | 'auto' = automático (mostrar inteiro, não cortar)
--            Não afeta King Forms nem outras partes do sistema.
-- ===========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'header_banner_fit'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN header_banner_fit VARCHAR(20) DEFAULT 'cover';
        RAISE NOTICE 'Coluna header_banner_fit adicionada à guest_list_items (uso exclusivo portaria)';
    ELSE
        RAISE NOTICE 'Coluna header_banner_fit já existe em guest_list_items';
    END IF;
END $$;

COMMENT ON COLUMN guest_list_items.header_banner_fit IS 'Enquadramento do banner na portaria: cover=preencher/cortar, auto=mostrar inteiro. Não afeta formulários.';
