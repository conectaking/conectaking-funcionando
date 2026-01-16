-- ===========================================
-- Migration: Adicionar custom_slug à tabela unique_form_links
-- Data: 2026-01-16
-- Descrição: Permite personalizar o slug dos links únicos (ex: /usuario/form/share/meu-link-personalizado)
-- ===========================================

DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'unique_form_links'
    ) THEN
        -- Adicionar coluna custom_slug se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
            AND column_name = 'custom_slug'
        ) THEN
            ALTER TABLE unique_form_links 
            ADD COLUMN custom_slug VARCHAR(255) UNIQUE;
            
            -- Criar índice para busca rápida
            CREATE INDEX IF NOT EXISTS idx_unique_form_links_custom_slug ON unique_form_links(custom_slug);
            
            RAISE NOTICE 'Coluna custom_slug adicionada com sucesso à tabela unique_form_links!';
        ELSE
            RAISE NOTICE 'Coluna custom_slug já existe na tabela unique_form_links.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela unique_form_links não existe. Execute a migration 084 primeiro.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 088 concluída! Verifique os logs acima.' AS status;
