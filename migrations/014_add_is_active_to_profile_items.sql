-- ===========================================
-- Migration: Adicionar coluna is_active à tabela profile_items
-- Data: 2025-01-29
-- Descrição: Adiciona a coluna is_active para permitir ativar/desativar módulos
-- ===========================================

-- Adicionar coluna is_active se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
        
        -- Criar índice para melhor performance nas consultas
        CREATE INDEX IF NOT EXISTS idx_profile_items_is_active 
        ON profile_items(user_id, is_active) 
        WHERE is_active = TRUE;
        
        RAISE NOTICE 'Coluna is_active adicionada com sucesso à tabela profile_items';
    ELSE
        RAISE NOTICE 'Coluna is_active já existe na tabela profile_items';
    END IF;
END $$;

-- Verificar se a coluna foi criada
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'is_active';

