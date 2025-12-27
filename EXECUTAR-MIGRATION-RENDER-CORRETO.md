# ✅ Como Executar Migration no Render - CORRETO

## ⚠️ IMPORTANTE: Você precisa estar no Shell do PostgreSQL, NÃO do Web Service!

### Passo a Passo CORRETO:

1. **Acesse o dashboard do Render**
   - https://dashboard.render.com
   - Faça login

2. **Encontre o serviço PostgreSQL (NÃO o Web Service)**
   - Na lista de serviços, procure pelo serviço **PostgreSQL** (geralmente tem um ícone de banco de dados)
   - **NÃO** use o serviço "conectaking-api" (esse é o Web Service)
   - Clique no serviço **PostgreSQL**

3. **Abra o Shell do PostgreSQL**
   - No serviço PostgreSQL, clique na aba **"Shell"**
   - Um terminal abrirá conectado diretamente ao PostgreSQL

4. **Execute a migration**
   - No Shell do PostgreSQL, você já estará conectado
   - Cole o conteúdo do arquivo `MIGRATION-ULTRA-SIMPLES.sql`
   - OU execute:
   ```bash
   \i migrations/017_create_sales_pages_module.sql
   ```

## 🔍 Como Identificar o Serviço Correto:

- ✅ **Serviço PostgreSQL**: Tem ícone de banco de dados, nome tipo "postgres" ou "database"
- ❌ **Serviço Web**: Tem ícone de servidor/web, nome tipo "conectaking-api" ou "web-service"

## 📝 Alternativa: Executar SQL Direto no Shell do PostgreSQL

No Shell do PostgreSQL, você pode executar SQL diretamente:

1. Abra o Shell do PostgreSQL
2. Cole o conteúdo do arquivo `MIGRATION-ULTRA-SIMPLES.sql`
3. Pressione Enter
4. Aguarde a execução

## ✅ Execute no Shell do PostgreSQL, não no Web Service!

