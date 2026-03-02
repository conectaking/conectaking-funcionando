-- ===========================================
-- Migration 198: Módulo Localização (cartão virtual)
-- Rotas isoladas em /api/location - não altera rotas existentes
-- ===========================================

-- PASSO 1: Adicionar location ao item_type_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum' AND e.enumlabel = 'location'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'location';
        RAISE NOTICE 'location adicionado ao item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Tabela location_items (um por profile_item)
CREATE TABLE IF NOT EXISTS location_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,

    -- Endereço e coordenadas
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

COMMENT ON TABLE location_items IS 'Localização de trabalho para o cartão virtual (mapa, Waze, Google Maps)';

CREATE OR REPLACE FUNCTION update_location_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_location_items_updated_at ON location_items;
CREATE TRIGGER trigger_location_items_updated_at
    BEFORE UPDATE ON location_items
    FOR EACH ROW
    EXECUTE FUNCTION update_location_items_updated_at();

-- PASSO 3: Recriar constraint profile_items_item_type_check para incluir 'location'
-- (enum já foi atualizado no PASSO 1; em bancos que usam CHECK com enum, recriar a partir do enum)
DO $$
DECLARE
    labels_sql TEXT;
    c RECORD;
BEGIN
    SELECT string_agg(quote_literal(e.enumlabel) || '::item_type_enum', ', ' ORDER BY e.enumsortorder)
    INTO labels_sql
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'item_type_enum';

    IF labels_sql IS NOT NULL AND length(labels_sql) > 0 THEN
        FOR c IN
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'profile_items' AND tc.constraint_type = 'CHECK'
              AND tc.constraint_name ILIKE '%item_type%'
        LOOP
            EXECUTE 'ALTER TABLE profile_items DROP CONSTRAINT IF EXISTS ' || quote_ident(c.constraint_name);
        END LOOP;
        EXECUTE 'ALTER TABLE profile_items ADD CONSTRAINT profile_items_item_type_check CHECK (item_type = ANY (ARRAY[' || labels_sql || ']))';
        RAISE NOTICE 'profile_items_item_type_check recriada com location.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'profile_items constraint não alterada (pode usar enum direto): %', SQLERRM;
END $$;

-- PASSO 4: Inserir location em module_plan_availability para todos os planos
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
        SELECT 'location', plan_code_var, true
        WHERE NOT EXISTS (
            SELECT 1 FROM module_plan_availability
            WHERE module_type = 'location' AND plan_code = plan_code_var
        );
    END LOOP;
END $$;

SELECT 'Migration 198: Módulo Localização criado.' AS status;
