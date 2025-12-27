-- ===========================================
-- MIGRATION MÍNIMA - Apenas criar as 3 tabelas principais
-- Execute este script se os ENUMs já existirem
-- ===========================================

-- Se os ENUMs não existirem, execute primeiro:
-- CREATE TYPE sales_page_status AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
-- CREATE TYPE product_status AS ENUM ('ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED');
-- CREATE TYPE event_type AS ENUM ('page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_click');

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

-- Verificar se foram criadas
SELECT 'Tabelas criadas:' as resultado, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events')
ORDER BY table_name;

