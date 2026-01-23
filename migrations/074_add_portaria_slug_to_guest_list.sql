-- Migration 074: Adicionar campo portaria_slug para personalizar link da portaria
-- Data: 2026-01-10
-- Descrição: Adiciona campo para permitir personalização do link da portaria com slug curto

DO $$ 
BEGIN
    -- Adicionar coluna portaria_slug se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'portaria_slug'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN portaria_slug VARCHAR(50) UNIQUE;
        
        COMMENT ON COLUMN guest_list_items.portaria_slug IS 'Slug personalizado para o link da portaria (ex: "portaria-2026", "conecta-portaria"). Se definido, substitui o token longo no link.';
        
        -- Criar índice para busca rápida
        CREATE INDEX IF NOT EXISTS idx_guest_list_items_portaria_slug ON guest_list_items(portaria_slug);
        
        RAISE NOTICE 'Coluna portaria_slug adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna portaria_slug já existe na guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 074 concluída com sucesso! Campo portaria_slug adicionado à guest_list_items.' AS status;
