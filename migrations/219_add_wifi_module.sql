-- ===========================================
-- Migration: Módulo Wi‑Fi (tipo wifi em item_type_enum + disponibilidade por plano)
-- ===========================================

-- 1) Novo valor no enum (idempotente)
DO $$
BEGIN
    BEGIN
        ALTER TYPE item_type_enum ADD VALUE 'wifi';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 2) Recriar CHECK de profile_items alinhada ao enum (igual 144/168)
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
        RAISE NOTICE 'profile_items.item_type não usa item_type_enum. Nada a fazer na CHECK.';
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
    RAISE NOTICE 'profile_items_item_type_check recriada com wifi e demais valores do enum.';
END $$;

-- 3) Disponibilidade em module_plan_availability (todos os planos conhecidos + ativos em subscription_plans)
DO $$
DECLARE
    plan_codes TEXT[] := ARRAY[
        'free', 'basic', 'premium', 'enterprise',
        'king_base', 'king_essential', 'king_finance', 'king_finance_plus', 'king_premium_plus',
        'king_corporate', 'adm_principal'
    ];
    plan_code_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'wifi', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'wifi' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'wifi', sp.plan_code, true
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM module_plan_availability mpa
      WHERE mpa.module_type = 'wifi' AND mpa.plan_code = sp.plan_code
  );

SELECT 'Migration 219: wifi em enum, CHECK e module_plan_availability.' AS status;
