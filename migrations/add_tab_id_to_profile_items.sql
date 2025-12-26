-- ===========================================
-- Migration: Adicionar tab_id à tabela profile_items
-- Data: 2025-01-31
-- Descrição: Permite associar módulos a abas específicas
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profile_items'
        AND column_name = 'tab_id'
    ) THEN
        ALTER TABLE profile_items
        ADD COLUMN tab_id INTEGER REFERENCES profile_tabs(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_profile_items_tab_id ON profile_items(tab_id);
        
        RAISE NOTICE 'Coluna tab_id adicionada com sucesso à tabela profile_items';
    ELSE
        RAISE NOTICE 'Coluna tab_id já existe na tabela profile_items';
    END IF;
END $$;

