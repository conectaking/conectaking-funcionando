-- ===========================================
-- Migration 173: Adicionar bible à CHECK de profile_items e module_plan_availability
-- Recria a CHECK a partir do enum (evita violação). Bíblia disponível para TODOS os planos.
-- ===========================================

-- PASSO 1: Recriar constraint CHECK a partir dos valores atuais do enum
DO $$
DECLARE
    col RECORD;
    labels_sql TEXT;
    c RECORD;
BEGIN
    SELECT data_type, udt_name INTO col
    FROM information_schema.columns
    WHERE table_name = 'profile_items' AND column_name = 'item_type';

    IF col.data_type <> 'USER-DEFINED' OR col.udt_name <> 'item_type_enum' THEN
        RAISE NOTICE 'profile_items.item_type não usa item_type_enum. Nada a fazer.';
        RETURN;
    END IF;

    SELECT string_agg(quote_literal(e.enumlabel) || '::item_type_enum', ', ' ORDER BY e.enumsortorder)
    INTO labels_sql
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'item_type_enum';

    IF labels_sql IS NULL OR length(labels_sql) = 0 THEN
        RAISE NOTICE 'Não foi possível listar item_type_enum.';
        RETURN;
    END IF;

    FOR c IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'profile_items' AND tc.constraint_type = 'CHECK'
          AND (tc.constraint_name ILIKE '%item_type%' OR (cc.check_clause IS NOT NULL AND cc.check_clause ILIKE '%item_type%'))
    LOOP
        EXECUTE 'ALTER TABLE profile_items DROP CONSTRAINT IF EXISTS ' || quote_ident(c.constraint_name);
    END LOOP;

    EXECUTE 'ALTER TABLE profile_items ADD CONSTRAINT profile_items_item_type_check CHECK (item_type = ANY (ARRAY[' || labels_sql || ']))';
    RAISE NOTICE 'profile_items_item_type_check recriada com bible e todos os valores do enum.';
END $$;

-- PASSO 2: Inserir bible em module_plan_availability para TODOS os planos
DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'premium', 'king_base', 'king_essential',
        'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal'
    ];
    plan_code_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'bible', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'bible' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

SELECT 'Migration 173: bible na CHECK e em module_plan_availability.' AS status;
