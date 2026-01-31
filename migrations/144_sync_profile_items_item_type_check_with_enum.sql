-- ===========================================
-- Migration: Sincronizar CHECK de item_type com item_type_enum (se existir)
-- Data: 2026-01-31
-- Descrição:
-- Alguns bancos têm ENUM (item_type_enum) e também uma CHECK (ex.: profile_items_item_type_check)
-- que valida item_type via ARRAY[...]::item_type_enum.
-- Quando adicionamos um novo valor no enum, essa CHECK pode continuar bloqueando o insert.
-- Esta migration:
-- - só roda se item_type for USER-DEFINED e udt_name = item_type_enum
-- - remove CHECKs existentes que referenciem item_type
-- - recria uma CHECK alinhada com os valores atuais do enum (inclui king_selection, etc.)
-- ===========================================

DO $$
DECLARE
    col RECORD;
    labels_sql TEXT;
    c RECORD;
BEGIN
    SELECT data_type, udt_name
    INTO col
    FROM information_schema.columns
    WHERE table_name = 'profile_items' AND column_name = 'item_type';

    IF col.data_type <> 'USER-DEFINED' OR col.udt_name <> 'item_type_enum' THEN
        RAISE NOTICE 'profile_items.item_type não usa item_type_enum. Nada a fazer.';
        RETURN;
    END IF;

    -- Montar lista de labels do enum em formato: 'x'::item_type_enum, 'y'::item_type_enum, ...
    SELECT string_agg(quote_literal(e.enumlabel) || '::item_type_enum', ', ' ORDER BY e.enumsortorder)
    INTO labels_sql
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'item_type_enum';

    IF labels_sql IS NULL OR length(labels_sql) = 0 THEN
        RAISE NOTICE 'Não foi possível listar item_type_enum.';
        RETURN;
    END IF;

    -- Remover CHECKs existentes que referenciem item_type na tabela profile_items
    FOR c IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
            ON cc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'profile_items'
          AND tc.constraint_type = 'CHECK'
          AND (tc.constraint_name ILIKE '%item_type%' OR cc.check_clause ILIKE '%item_type%')
    LOOP
        EXECUTE 'ALTER TABLE profile_items DROP CONSTRAINT IF EXISTS ' || quote_ident(c.constraint_name);
    END LOOP;

    -- Recriar CHECK alinhada com o enum atual
    EXECUTE
        'ALTER TABLE profile_items ' ||
        'ADD CONSTRAINT profile_items_item_type_check ' ||
        'CHECK (item_type = ANY (ARRAY[' || labels_sql || ']))';

    RAISE NOTICE 'CHECK profile_items_item_type_check recriada com base no item_type_enum.';
END$$;

