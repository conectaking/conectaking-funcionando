-- ===========================================
-- Migration 219 (parte 1): valor 'wifi' no enum item_type_enum
-- Deve correr em ficheiro separado da parte 2 — PostgreSQL não permite usar
-- um valor novo do enum na mesma transação (erro 55P04).
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum'
          AND e.enumlabel = 'wifi'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'wifi';
    END IF;
END $$;

SELECT 'Migration 219 (parte 1): enum item_type_enum + wifi.' AS status;
