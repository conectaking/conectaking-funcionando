-- ===========================================
-- MIGRATION COMPLETA - EXECUTE TUDO DE UMA VEZ
-- Selecione TODO (Ctrl+A) e execute (Ctrl+Enter)
-- ===========================================

-- Criar ENUMs (execute mesmo se der erro de "já existe" - ignore o erro)
DO $$ BEGIN CREATE TYPE sales_page_status AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_status AS ENUM ('ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE event_type AS ENUM ('page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_click'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adicionar sales_page ao item_type_enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'sales_page' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'sales_page';
    END IF;
END $$;

-- Criar tabela sales_pages
CREATE TABLE IF NOT EXISTS sales_pages (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,
    slug VARCHAR(255) UNIQUE,
    store_title VARCHAR(255) NOT NULL,
    store_description TEXT,
    button_text VARCHAR(100),
    button_logo_url TEXT,
    theme VARCHAR(10) DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    button_color VARCHAR(7),
    button_text_color VARCHAR(7),
    background_image_url TEXT,
    whatsapp_number VARCHAR(20) NOT NULL,
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_image_url TEXT,
    preview_token VARCHAR(255) UNIQUE,
    status sales_page_status DEFAULT 'DRAFT',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- Criar tabela sales_page_products
CREATE TABLE IF NOT EXISTS sales_page_products (
    id SERIAL PRIMARY KEY,
    sales_page_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    compare_price DECIMAL(10,2),
    stock INTEGER DEFAULT NULL,
    variations JSONB,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    status product_status DEFAULT 'ACTIVE',
    badge VARCHAR(50),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sales_page_id) REFERENCES sales_pages(id) ON DELETE CASCADE
);

-- Criar tabela sales_page_events
CREATE TABLE IF NOT EXISTS sales_page_events (
    id SERIAL PRIMARY KEY,
    sales_page_id INTEGER NOT NULL,
    product_id INTEGER,
    event_type event_type NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sales_page_id) REFERENCES sales_pages(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES sales_page_products(id) ON DELETE SET NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_sales_pages_profile_item ON sales_pages(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_pages_slug ON sales_pages(slug);
CREATE INDEX IF NOT EXISTS idx_sales_pages_status ON sales_pages(status);
CREATE INDEX IF NOT EXISTS idx_sales_pages_preview_token ON sales_pages(preview_token);
CREATE INDEX IF NOT EXISTS idx_products_sales_page ON sales_page_products(sales_page_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON sales_page_products(status, display_order);
CREATE INDEX IF NOT EXISTS idx_products_featured ON sales_page_products(sales_page_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_sales_page ON sales_page_events(sales_page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_product ON sales_page_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_type ON sales_page_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON sales_page_events(created_at DESC);

-- Criar funções e triggers
CREATE OR REPLACE FUNCTION update_sales_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sales_pages_updated_at ON sales_pages;
CREATE TRIGGER trigger_update_sales_pages_updated_at
    BEFORE UPDATE ON sales_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_pages_updated_at();

CREATE OR REPLACE FUNCTION update_sales_page_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sales_page_products_updated_at ON sales_page_products;
CREATE TRIGGER trigger_update_sales_page_products_updated_at
    BEFORE UPDATE ON sales_page_products
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_page_products_updated_at();

-- VERIFICAÇÃO FINAL
SELECT '✅ MIGRATION CONCLUÍDA!' as status;
SELECT table_name as "Tabelas criadas"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

