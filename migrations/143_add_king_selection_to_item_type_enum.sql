-- ===========================================
-- Migration: Adicionar king_selection ao enum item_type_enum
-- Data: 2026-01-31
-- Descrição: profile_items.item_type usa ENUM (USER-DEFINED). Precisamos incluir o novo valor.
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum'
          AND e.enumlabel = 'king_selection'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'king_selection';
    END IF;
END$$;

