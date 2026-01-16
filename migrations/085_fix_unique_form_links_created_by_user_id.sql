-- ===========================================
-- Migration: Corrigir tipo de created_by_user_id na tabela unique_form_links
-- Data: 2026-01-16
-- Descrição: Altera created_by_user_id de INTEGER para VARCHAR(255) para corresponder ao formato de user_id
-- ===========================================

DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'unique_form_links'
    ) THEN
        -- Verificar o tipo atual da coluna
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
            AND column_name = 'created_by_user_id'
            AND data_type = 'integer'
        ) THEN
            -- Alterar o tipo da coluna
            ALTER TABLE unique_form_links 
            ALTER COLUMN created_by_user_id TYPE VARCHAR(255);
            
            RAISE NOTICE 'Coluna created_by_user_id alterada de INTEGER para VARCHAR(255) com sucesso!';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'unique_form_links'
            AND column_name = 'created_by_user_id'
            AND data_type = 'character varying'
        ) THEN
            RAISE NOTICE 'Coluna created_by_user_id já está como VARCHAR(255). Nenhuma alteração necessária.';
        ELSE
            RAISE NOTICE 'Coluna created_by_user_id não encontrada. Pode não existir ainda.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela unique_form_links não existe. Execute a migration 084 primeiro.';
    END IF;
END $$;

-- Verificação final
SELECT 'Migration 085 concluída! Verifique os logs acima.' AS status;
