-- ===========================================
-- Migration: Criar módulo completo de Página de Vendas
-- Data: 2025-01-31
-- Descrição: Cria tabelas, enums, índices e constraints para o módulo de página de vendas premium
-- ===========================================

-- Criar ENUMs
DO $$ BEGIN
    CREATE TYPE sales_page_status AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_click');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar sales_page ao ENUM item_type_enum se não existir
DO $$ BEGIN
    ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'sales_page';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela sales_pages
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

-- Tabela sales_page_products
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

-- Tabela sales_page_events
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

-- Índices para sales_pages
CREATE INDEX IF NOT EXISTS idx_sales_pages_profile_item ON sales_pages(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_pages_slug ON sales_pages(slug);
CREATE INDEX IF NOT EXISTS idx_sales_pages_status ON sales_pages(status);
CREATE INDEX IF NOT EXISTS idx_sales_pages_preview_token ON sales_pages(preview_token);

-- Índices para sales_page_products
CREATE INDEX IF NOT EXISTS idx_products_sales_page ON sales_page_products(sales_page_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON sales_page_products(status, display_order);
CREATE INDEX IF NOT EXISTS idx_products_featured ON sales_page_products(sales_page_id, is_featured) WHERE is_featured = true;

-- Índices para sales_page_events
CREATE INDEX IF NOT EXISTS idx_events_sales_page ON sales_page_events(sales_page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_product ON sales_page_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_type ON sales_page_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON sales_page_events(created_at DESC);

-- Comentários
COMMENT ON TABLE sales_pages IS 'Armazena páginas de vendas dos usuários';
COMMENT ON TABLE sales_page_products IS 'Armazena produtos das páginas de vendas';
COMMENT ON TABLE sales_page_events IS 'Armazena eventos de analytics das páginas de vendas';
COMMENT ON COLUMN sales_pages.profile_item_id IS 'ID do item do tipo sales_page em profile_items';
COMMENT ON COLUMN sales_pages.slug IS 'Slug único para URL da página pública';
COMMENT ON COLUMN sales_pages.preview_token IS 'Token único para preview seguro de páginas em DRAFT';
COMMENT ON COLUMN sales_page_products.price IS 'Preço do produto (deve ser maior que zero)';
COMMENT ON COLUMN sales_page_products.display_order IS 'Ordem de exibição do produto na página';
COMMENT ON COLUMN sales_page_products.is_featured IS 'Indica se o produto é destaque (produto campeão)';

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_sales_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_update_sales_page_products_updated_at
    BEFORE UPDATE ON sales_page_products
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_page_products_updated_at();

