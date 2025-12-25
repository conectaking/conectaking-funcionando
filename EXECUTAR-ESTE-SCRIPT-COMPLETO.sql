-- ===========================================
-- SCRIPT COMPLETO - Execute TUDO de uma vez
-- ===========================================

-- PASSO 1: Criar a tabela (OBRIGATÓRIO PRIMEIRO)
CREATE TABLE IF NOT EXISTS product_catalog_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- PASSO 2: Criar índices
CREATE INDEX IF NOT EXISTS idx_product_catalog_items_profile_item ON product_catalog_items(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_items_display_order ON product_catalog_items(profile_item_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_catalog_items_created_at ON product_catalog_items(created_at DESC);

-- PASSO 3: Adicionar comentários
COMMENT ON TABLE product_catalog_items IS 'Armazena produtos dos catálogos de produtos dos usuários';
COMMENT ON COLUMN product_catalog_items.profile_item_id IS 'ID do item do tipo product_catalog em profile_items';
COMMENT ON COLUMN product_catalog_items.price IS 'Preço do produto (deve ser maior que zero)';
COMMENT ON COLUMN product_catalog_items.display_order IS 'Ordem de exibição do produto no catálogo';

-- PASSO 4: Criar função
CREATE OR REPLACE FUNCTION update_product_catalog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: Criar trigger (AGORA sim, porque a tabela já existe)
CREATE TRIGGER trigger_update_product_catalog_items_updated_at
    BEFORE UPDATE ON product_catalog_items
    FOR EACH ROW
    EXECUTE FUNCTION update_product_catalog_items_updated_at();


