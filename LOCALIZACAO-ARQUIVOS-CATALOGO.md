# 📍 Localização dos Arquivos - Catálogo de Produtos

## 🗄️ BACKEND

### 1. **Rotas e Endpoints**

#### `conecta-king-backend/routes/profile.js`
- **O que faz:** Adiciona suporte para criar item tipo `product_catalog`
- **Linha aproximada:** ~219 (onde está o case `product_catalog`)
- **Função:** Quando usuário cria novo catálogo, cria item inicial

#### `conecta-king-backend/routes/products.js` ⭐ **NOVO ARQUIVO**
- **O que faz:** CRUD completo de produtos
- **Endpoints:**
  - `GET /api/profile/items/:itemId/products` - Listar produtos
  - `POST /api/profile/items/:itemId/products` - Adicionar produto
  - `PUT /api/profile/items/:itemId/products/:productId` - Atualizar produto
  - `DELETE /api/profile/items/:itemId/products/:productId` - Remover produto

#### `conecta-king-backend/routes/publicProduct.js` ⭐ **NOVO ARQUIVO**
- **O que faz:** Rota pública para visualizar produto individual
- **Rota:** `GET /:slug/produto/:productId`
- **Exemplo:** `https://tag.conectaking.com.br/Adrianokigg/produto/123`

#### `conecta-king-backend/routes/publicProfile.js`
- **O que faz:** Carrega produtos junto com itens do catálogo
- **Linha aproximada:** ~115 (onde carrega produtos dos catálogos)
- **Função:** Busca produtos do banco e adiciona ao objeto `item.products`

### 2. **Templates (Views)**

#### `conecta-king-backend/views/profile.ejs`
- **O que faz:** Renderiza o botão do catálogo na página pública
- **Linha aproximada:** ~795-799 (renderização do botão)
- **Linha aproximada:** ~1430-1750 (JavaScript do modal e carrinho)
- **Funções JavaScript:**
  - `openProductCatalog()` - Abre modal do catálogo
  - `updateCartCount()` - Atualiza contador do carrinho
  - `updateCartTotal()` - Calcula total do carrinho
  - `checkoutCart()` - Gera mensagem WhatsApp e redireciona

#### `conecta-king-backend/views/product.ejs` ⭐ **NOVO ARQUIVO**
- **O que faz:** Página individual do produto
- **Exibe:** Foto grande, nome, descrição, preço
- **Botão:** "Voltar ao Catálogo"

### 3. **Migrations (Banco de Dados)**

#### `conecta-king-backend/migrations/009_add_product_catalog_to_enum.sql`
- **O que faz:** Adiciona `product_catalog` ao ENUM `item_type_enum`

#### `conecta-king-backend/migrations/010_create_product_catalog_items_table.sql`
- **O que faz:** Cria tabela `product_catalog_items`
- **Tabela:** Armazena produtos (id, name, description, price, image_url, etc.)

### 4. **Configuração do Servidor**

#### `conecta-king-backend/server.js`
- **Linha aproximada:** ~33 (import do productsRoutes)
- **Linha aproximada:** ~220 (registro da rota `/api/profile` para produtos)
- **Linha aproximada:** ~224-225 (registro da rota pública de produtos)

---

## 💻 FRONTEND (Dashboard)

### 1. **Interface de Gerenciamento**

#### `public_html/dashboard.js`
- **Linha aproximada:** ~845 (ITEM_TYPE_LABELS - adiciona "Catálogo de Produtos")
- **Linha aproximada:** ~2632-2670 (renderItem - case 'product_catalog' - renderiza item no dashboard)
- **Linha aproximada:** ~2140-2145 (preservedStates - salva estado do catálogo)
- **Linha aproximada:** ~2280-2286 (restoreState - restaura estado do catálogo)
- **Linha aproximada:** ~3475-3480 (saveEditModalBtn - salva dados do catálogo)
- **Linha aproximada:** ~4053-4085 (openEditModal - modal de edição do catálogo)
- **Linha aproximada:** ~4690-4705 (openEditModalForNewItem - modal para novo catálogo)
- **Linha aproximada:** ~6643-6950 (funções JavaScript para gerenciar produtos):
  - `loadProductsForCatalog()` - Carrega produtos do catálogo
  - `openProductEditModal()` - Abre modal para adicionar/editar produto
  - `deleteProduct()` - Remove produto

---

## 📊 BANCO DE DADOS

### Tabelas:

1. **`profile_items`** (já existia)
   - Campo: `item_type` agora aceita `'product_catalog'`
   - Campo: `destination_url` armazena número do WhatsApp

2. **`product_catalog_items`** ⭐ **NOVA TABELA**
   - `id` (SERIAL PRIMARY KEY)
   - `profile_item_id` (FK para profile_items)
   - `name` (nome do produto)
   - `description` (descrição)
   - `price` (preço)
   - `image_url` (URL da imagem)
   - `display_order` (ordem de exibição)
   - `created_at`, `updated_at` (timestamps)

---

## 🔄 FLUXO COMPLETO

### 1. **Dashboard (Usuário adiciona produtos)**
```
dashboard.html → dashboard.js → API /api/profile/items/:itemId/products
```

### 2. **Página Pública (Cliente visualiza e compra)**
```
profile.ejs → renderiza botão → abre modal → carrinho → WhatsApp
```

### 3. **Página Individual do Produto**
```
/:slug/produto/:productId → publicProduct.js → product.ejs
```

---

## 📝 RESUMO DOS ARQUIVOS CRIADOS/MODIFICADOS

### ✅ Arquivos NOVOS:
1. `conecta-king-backend/routes/products.js`
2. `conecta-king-backend/routes/publicProduct.js`
3. `conecta-king-backend/views/product.ejs`
4. `conecta-king-backend/migrations/009_add_product_catalog_to_enum.sql`
5. `conecta-king-backend/migrations/010_create_product_catalog_items_table.sql`

### ✏️ Arquivos MODIFICADOS:
1. `conecta-king-backend/routes/profile.js` (adiciona case product_catalog)
2. `conecta-king-backend/routes/publicProfile.js` (carrega produtos)
3. `conecta-king-backend/server.js` (registra novas rotas)
4. `conecta-king-backend/views/profile.ejs` (modal e JavaScript do catálogo)
5. `public_html/dashboard.js` (interface de gerenciamento)

---

## 🎯 ONDE ESTÁ CADA FUNCIONALIDADE

### **Adicionar Produto:**
- Frontend: `dashboard.js` linha ~6643 (`openProductEditModal`)
- Backend: `routes/products.js` linha ~36 (`POST /api/profile/items/:itemId/products`)

### **Listar Produtos:**
- Frontend: `dashboard.js` linha ~6643 (`loadProductsForCatalog`)
- Backend: `routes/products.js` linha ~11 (`GET /api/profile/items/:itemId/products`)

### **Modal do Catálogo na Página Pública:**
- Frontend: `views/profile.ejs` linha ~1430 (`openProductCatalog`)

### **Carrinho de Compras:**
- Frontend: `views/profile.ejs` linha ~1430-1750 (funções do carrinho em JavaScript)

### **Finalizar Compra (WhatsApp):**
- Frontend: `views/profile.ejs` linha ~1700 (`checkoutCart`)

### **Página Individual do Produto:**
- Backend: `routes/publicProduct.js` (rota)
- Frontend: `views/product.ejs` (template)

