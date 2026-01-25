-- ===========================================
-- Migration: portaria_subtitle (apenas portaria)
-- Descrição: Texto editável do subtítulo na portaria (ex.: "Visualização completa para portaria").
--            Só afeta a tela da portaria; não altera formulários nem confirmação.
-- ===========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'portaria_subtitle'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN portaria_subtitle VARCHAR(255) DEFAULT 'Visualização completa para portaria';
        RAISE NOTICE 'Coluna portaria_subtitle adicionada à guest_list_items (uso exclusivo portaria)';
    ELSE
        RAISE NOTICE 'Coluna portaria_subtitle já existe em guest_list_items';
    END IF;
END $$;

COMMENT ON COLUMN guest_list_items.portaria_subtitle IS 'Subtítulo exibido na portaria (ex.: Visualização completa para portaria). Só afeta a view da portaria.';
