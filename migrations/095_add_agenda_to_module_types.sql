-- Migration: Adicionar tipo 'agenda' ao enum de tipos de módulos
-- Data: 2025-01-31
-- Descrição: Adiciona 'agenda' ao enum item_type_enum para que apareça em "Adicionar Módulo"

-- Verificar se o tipo já existe antes de adicionar
DO $$ 
BEGIN
    -- Tentar adicionar o valor ao enum
    -- Se já existir, não dará erro devido ao IF NOT EXISTS
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'agenda' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'agenda';
    END IF;
END $$;

-- Comentário
COMMENT ON TYPE item_type_enum IS 'Tipos de módulos disponíveis no ConectaKing (inclui agenda)';
