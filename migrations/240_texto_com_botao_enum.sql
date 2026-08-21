-- ===========================================
-- Migration 240 (parte 1): valor 'texto_com_botao' no enum item_type_enum
-- Ficheiro separado da parte 2 — PostgreSQL não permite usar o valor novo
-- do enum na mesma transação (erro 55P04).
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum'
          AND e.enumlabel = 'texto_com_botao'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'texto_com_botao';
    END IF;
END $$;

SELECT 'Migration 240 (parte 1): enum item_type_enum + texto_com_botao.' AS status;
