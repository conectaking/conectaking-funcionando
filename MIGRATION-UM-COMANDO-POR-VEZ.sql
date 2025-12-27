-- ===========================================
-- MIGRATION SALES PAGES - EXECUTE UM COMANDO POR VEZ
-- Selecione CADA comando individualmente e execute (Ctrl+Enter)
-- ===========================================

-- COMANDO 1: Criar ENUM sales_page_status
CREATE TYPE sales_page_status AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- COMANDO 2: Criar ENUM product_status  
CREATE TYPE product_status AS ENUM ('ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED');

-- COMANDO 3: Criar ENUM event_type
CREATE TYPE event_type AS ENUM ('page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_click');

-- COMANDO 4: Adicionar sales_page ao item_type_enum
-- IMPORTANTE: Execute este em uma NOVA aba SQL se der erro de transação
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'sales_page';

-- COMANDO 5: Criar tabela sales_pages
CREATE TABLE sales_pages (
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

-- COMANDO 6: Criar tabela sales_page_products
CREATE TABLE sales_page_products (
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

-- COMANDO 7: Criar tabela sales_page_events
CREATE TABLE sales_page_events (
    id SERIAL PRIMARY KEY,
    sales_page_id INTEGER NOT NULL,
    product_id INTEGER,
    event_type event_type NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sales_page_id) REFERENCES sales_pages(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES sales_page_products(id) ON DELETE SET NULL
);

-- COMANDO 8: Criar índices para sales_pages
CREATE INDEX idx_sales_pages_profile_item ON sales_pages(profile_item_id);
CREATE INDEX idx_sales_pages_slug ON sales_pages(slug);
CREATE INDEX idx_sales_pages_status ON sales_pages(status);
CREATE INDEX idx_sales_pages_preview_token ON sales_pages(preview_token);

-- COMANDO 9: Criar índices para sales_page_products
CREATE INDEX idx_products_sales_page ON sales_page_products(sales_page_id);
CREATE INDEX idx_products_status ON sales_page_products(status, display_order);
CREATE INDEX idx_products_featured ON sales_page_products(sales_page_id, is_featured) WHERE is_featured = true;

-- COMANDO 10: Criar índices para sales_page_events
CREATE INDEX idx_events_sales_page ON sales_page_events(sales_page_id, created_at DESC);
CREATE INDEX idx_events_product ON sales_page_events(product_id, event_type);
CREATE INDEX idx_events_type ON sales_page_events(event_type, created_at DESC);
CREATE INDEX idx_events_created_at ON sales_page_events(created_at DESC);

-- COMANDO 11: Criar função para trigger updated_at sales_pages
CREATE OR REPLACE FUNCTION update_sales_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- COMANDO 12: Criar trigger para sales_pages
CREATE TRIGGER trigger_update_sales_pages_updated_at
    BEFORE UPDATE ON sales_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_pages_updated_at();

-- COMANDO 13: Criar função para trigger updated_at products
CREATE OR REPLACE FUNCTION update_sales_page_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- COMANDO 14: Criar trigger para sales_page_products
CREATE TRIGGER trigger_update_sales_page_products_updated_at
    BEFORE UPDATE ON sales_page_products
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_page_products_updated_at();

-- ===========================================
-- VERIFICAÇÃO FINAL - Execute este último
-- ===========================================
SELECT 'Tabelas criadas:' as resultado, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

