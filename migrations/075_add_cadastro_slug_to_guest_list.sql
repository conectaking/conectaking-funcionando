-- Migration 075: Adicionar campo cadastro_slug para personalizar link de cadastro
-- Data: 2026-01-13
-- Descrição: Adiciona campo para permitir personalização do link de cadastro com slug curto

DO $$ 
BEGIN
    -- Adicionar coluna cadastro_slug se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'cadastro_slug'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN cadastro_slug VARCHAR(50) UNIQUE;
        
        COMMENT ON COLUMN guest_list_items.cadastro_slug IS 'Slug personalizado para o link de cadastro (ex: "cadastro-2026", "inscricao-conecta"). Se definido, substitui o share_token longo no link.';
        
        -- Criar índice para busca rápida
        CREATE INDEX IF NOT EXISTS idx_guest_list_items_cadastro_slug ON guest_list_items(cadastro_slug);
        
        RAISE NOTICE 'Coluna cadastro_slug adicionada com sucesso à guest_list_items!';
    ELSE
        RAISE NOTICE 'Coluna cadastro_slug já existe na guest_list_items.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 075 concluída com sucesso! Campo cadastro_slug adicionado à guest_list_items.' AS status;
