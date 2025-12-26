-- ===========================================
-- Migration: Adicionar tab_id à tabela profile_items
-- Data: 2025-01-31
-- Descrição: Permite associar módulos a abas específicas
-- IMPORTANTE: Execute primeiro a migration 011_create_profile_tabs_table.sql
-- ===========================================

DO $$
BEGIN
    -- Verificar se a tabela profile_tabs existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'profile_tabs'
    ) THEN
        RAISE EXCEPTION 'ERRO: A tabela profile_tabs não existe. Execute primeiro a migration 011_create_profile_tabs_table.sql';
    END IF;
    
    -- Verificar se a coluna tab_id já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profile_items'
        AND column_name = 'tab_id'
    ) THEN
        -- Adicionar coluna sem foreign key primeiro
        ALTER TABLE profile_items
        ADD COLUMN tab_id INTEGER;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_profile_items_tab_id ON profile_items(tab_id);
        
        -- Adicionar foreign key depois
        ALTER TABLE profile_items
        ADD CONSTRAINT fk_profile_items_tab_id 
        FOREIGN KEY (tab_id) REFERENCES profile_tabs(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Coluna tab_id adicionada com sucesso à tabela profile_items';
    ELSE
        RAISE NOTICE 'Coluna tab_id já existe na tabela profile_items';
    END IF;
END $$;

