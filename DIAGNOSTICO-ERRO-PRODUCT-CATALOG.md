# 🔍 Diagnóstico: Erro 500 - Catálogo de Produtos

## Problema

A página pública está retornando JSON com erro:
```json
{
  "success": false,
  "message": "Erro interno do servidor"
}
```

## Possíveis Causas

### 1. **Tabela não existe no banco de produção** ⚠️ (Mais Provável)

A tabela `product_catalog_items` pode não ter sido criada no banco de dados do Render (produção).

**Como verificar:**
1. No DBeaver, conecte-se ao banco de produção: `conecta_king_db (virginia-postgres.render.com:5432)`
2. Execute:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'product_catalog_items';
```

**Se não retornar nenhuma linha:** A tabela não existe. Precisa executar as migrations no banco de produção.

**Se retornar a tabela:** O problema é outro, continue lendo.

---

### 2. **ENUM não tem o valor 'product_catalog'**

**Como verificar:**
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
AND enumlabel = 'product_catalog';
```

**Se não retornar nada:** Precisa executar a migration 009 no banco de produção.

---

### 3. **Constraint CHECK não inclui 'product_catalog'**

**Como verificar:**
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'profile_items_item_type_check';
```

**Verifique se a constraint inclui `'product_catalog'` na lista.**

**Se não incluir:** Precisa executar o script `FIX-CONSTRAINT-PRODUCT-CATALOG.sql` no banco de produção.

---

## Solução Completa para Produção

Execute TODAS estas migrations no banco de produção (Render):

### Passo 1: Adicionar ao ENUM
```sql
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'product_catalog';
```

### Passo 2: Criar tabela
```sql
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

CREATE INDEX IF NOT EXISTS idx_product_catalog_items_profile_item ON product_catalog_items(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_items_display_order ON product_catalog_items(profile_item_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_catalog_items_created_at ON product_catalog_items(created_at DESC);

COMMENT ON TABLE product_catalog_items IS 'Armazena produtos dos catálogos de produtos dos usuários';
COMMENT ON COLUMN product_catalog_items.profile_item_id IS 'ID do item do tipo product_catalog em profile_items';
COMMENT ON COLUMN product_catalog_items.price IS 'Preço do produto (deve ser maior que zero)';
COMMENT ON COLUMN product_catalog_items.display_order IS 'Ordem de exibição do produto no catálogo';

CREATE OR REPLACE FUNCTION update_product_catalog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_catalog_items_updated_at
    BEFORE UPDATE ON product_catalog_items
    FOR EACH ROW
    EXECUTE FUNCTION update_product_catalog_items_updated_at();
```

### Passo 3: Atualizar constraint CHECK

**Parte 1 (remover):**
```sql
ALTER TABLE profile_items 
DROP CONSTRAINT IF EXISTS profile_items_item_type_check;
```

**Parte 2 (criar nova):**
```sql
ALTER TABLE profile_items 
ADD CONSTRAINT profile_items_item_type_check 
CHECK (item_type IN (
    'link',
    'whatsapp',
    'telegram',
    'email',
    'facebook',
    'instagram',
    'pinterest',
    'reddit',
    'tiktok',
    'twitch',
    'twitter',
    'linkedin',
    'portfolio',
    'youtube',
    'spotify',
    'banner',
    'carousel',
    'pdf',
    'pdf_embed',
    'pix',
    'pix_qrcode',
    'instagram_embed',
    'youtube_embed',
    'tiktok_embed',
    'spotify_embed',
    'linkedin_embed',
    'pinterest_embed',
    'product_catalog'
));
```

---

## Verificação Final

Após executar tudo, verifique:

```sql
-- 1. Verificar tabela
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'product_catalog_items';

-- 2. Verificar ENUM
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
AND enumlabel = 'product_catalog';

-- 3. Verificar constraint
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'profile_items_item_type_check';
```

**Todos devem retornar resultados positivos.**

---

## Depois das Migrations

1. ✅ Reinicie o servidor no Render (ou aguarde o deploy automático)
2. ✅ Teste a página pública novamente
3. ✅ Deve funcionar sem erro 500

