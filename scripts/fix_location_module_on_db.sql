-- ===========================================
-- Script para corrigir o módulo Localização no banco (ex.: Render)
-- Execute este arquivo no PostgreSQL que a API usa (Render Shell ou psql).
-- Uso: psql $DATABASE_URL -f scripts/fix_location_module_on_db.sql
-- Ou no Render: copie e cole no Shell SQL do banco.
-- ===========================================

-- 1) Adicionar 'location' ao enum (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum' AND e.enumlabel = 'location'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'location';
        RAISE NOTICE 'location adicionado ao item_type_enum.';
    ELSE
        RAISE NOTICE 'location já existe no item_type_enum.';
    END IF;
END $$;

-- 2) Recriar a CHECK de profile_items para incluir 'location'
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
    RAISE NOTICE 'profile_items_item_type_check recriada (inclui location).';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao recriar constraint: %', SQLERRM;
END $$;

-- 3) Garantir tabela location_items (se a migration 198 não tiver rodado)
CREATE TABLE IF NOT EXISTS location_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,
    address TEXT,
    address_formatted TEXT,
    latitude DECIMAL(12, 8),
    longitude DECIMAL(12, 8),
    place_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_location_items_profile_item ON location_items(profile_item_id);

-- 4) Módulo disponível para todos os planos
DO $$
DECLARE
    plan_codes TEXT[] := ARRAY['free','basic','premium','king_base','king_essential','king_finance','king_finance_plus','king_premium_plus','king_corporate','adm_principal'];
    plan_code_var TEXT;
BEGIN
    FOREACH plan_code_var IN ARRAY plan_codes
    LOOP
        INSERT INTO module_plan_availability (module_type, plan_code, is_available)
        SELECT 'location', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'location' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

SELECT 'Módulo Localização corrigido no banco.' AS status;
