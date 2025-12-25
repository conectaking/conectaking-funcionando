# 🚀 Como Executar a Migration no Render

## ⚠️ PROBLEMA IDENTIFICADO

O erro `invalid input value for enum item_type_enum: "tiktok_embed"` acontece porque o banco de dados PostgreSQL tem um ENUM que não inclui os novos tipos de embed.

## ✅ SOLUÇÃO

Precisa executar a migration para adicionar os novos valores ao ENUM.

## 📋 Opções para Executar no Render

### **Opção 1: Via Shell do Render (RECOMENDADO)**

1. **Acesse o Dashboard do Render:**
   - https://dashboard.render.com
   - Entre no serviço `conectaking-api`

2. **Abra o Shell:**
   - No menu lateral, procure por "Shell" ou "Console"
   - Ou acesse diretamente a URL: `https://dashboard.render.com/web/[seu-service-id]/shell`

3. **Execute o comando:**
   ```bash
   npm run migrate-enum
   ```

4. **Ou execute diretamente:**
   ```bash
   node scripts/add-embed-types-to-enum.js
   ```

---

### **Opção 2: Via Cliente PostgreSQL (Alternativa)**

Se você tiver acesso direto ao banco de dados (via DBeaver, pgAdmin, etc):

1. **Conecte ao banco de dados do Render**
2. **Execute cada comando separadamente:**

```sql
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'tiktok_embed';
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'spotify_embed';
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'linkedin_embed';
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'pinterest_embed';
```

---

### **Opção 3: Via Endpoint Temporário da API (MAIS FÁCIL)**

Criei um endpoint temporário que você pode chamar via HTTP:

1. **Após o deploy do código atualizado, execute:**

```bash
curl -X POST https://conectaking-api.onrender.com/api/migration/add-embed-types \
  -H "Content-Type: application/json" \
  -d '{"token": "TEMPORARY_MIGRATION_TOKEN_2025"}'
```

2. **Ou use o navegador/postação HTTP (Postman, Insomnia):**

   - **URL:** `https://conectaking-api.onrender.com/api/migration/add-embed-types`
   - **Método:** POST
   - **Headers:** `Content-Type: application/json`
   - **Body:**
     ```json
     {
       "token": "TEMPORARY_MIGRATION_TOKEN_2025"
     }
     ```

3. **Resposta esperada:**
   ```json
   {
     "success": true,
     "message": "Migration executada",
     "results": [
       { "type": "tiktok_embed", "status": "added", "message": "tiktok_embed adicionado com sucesso" },
       { "type": "spotify_embed", "status": "added", "message": "spotify_embed adicionado com sucesso" },
       ...
     ],
     "enumValues": ["link", "whatsapp", ..., "tiktok_embed", "spotify_embed", ...]
   }
   ```

**⚠️ IMPORTANTE:** Após executar com sucesso, me avise para remover este endpoint por segurança.

---

## 🧪 Verificar se Funcionou

Após executar a migration:

1. **Teste criar um item:**
   - Acesse o dashboard
   - Tente criar um item do tipo "Spotify Incorporado" ou "TikTok Incorporado"
   - Deve funcionar sem erro

2. **Verificar no banco (opcional):**
   ```sql
   SELECT enumlabel 
   FROM pg_enum 
   WHERE enumtypid = (
       SELECT oid 
       FROM pg_type 
       WHERE typname = 'item_type_enum'
   )
   ORDER BY enumsortorder;
   ```

   Deve mostrar todos os tipos, incluindo:
   - `tiktok_embed`
   - `spotify_embed`
   - `linkedin_embed`
   - `pinterest_embed`

---

## ⚠️ IMPORTANTE

- Esta migration precisa ser executada **APENAS UMA VEZ**
- É segura para executar múltiplas vezes (usa `IF NOT EXISTS`)
- Após executar, o erro 500 deve ser resolvido

---

## 📞 Precisa de Ajuda?

Se não conseguir acessar o shell do Render, me avise que posso criar um endpoint temporário na API para executar a migration.

