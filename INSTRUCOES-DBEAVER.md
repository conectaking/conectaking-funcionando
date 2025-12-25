# 📋 Como Executar a Migration no DBeaver

## ✅ Passo a Passo

### 1. Conectar ao Banco de Dados do Render

1. Abra o DBeaver
2. Crie uma nova conexão PostgreSQL (se ainda não tiver)
3. Configure com os dados do Render:
   - **Host:** (verifique nas variáveis de ambiente do Render ou na string de conexão)
   - **Port:** 5432 (padrão PostgreSQL)
   - **Database:** (nome do banco)
   - **Username:** (usuário do banco)
   - **Password:** (senha do banco)
   - **SSL:** Habilitado (Use SSL mode: require ou prefer)

   **Dica:** Se tiver a string de conexão do Render, use o formato:
   ```
   postgresql://usuario:senha@host:5432/database?sslmode=require
   ```

### 2. Abrir o Arquivo SQL

1. No DBeaver, vá em: `File` → `Open SQL Script`
2. Navegue até: `EXECUTAR-DBEAVER.sql`
3. Ou copie e cole o conteúdo do arquivo em uma nova query SQL

### 3. Executar os Comandos

**Opção A: Executar todos de uma vez (Recomendado)**

1. Selecione todo o conteúdo do arquivo SQL
2. Clique com o botão direito → `Execute` → `Execute SQL Script`
3. Ou use o atalho: `Ctrl+Alt+X` (Windows) / `Cmd+Alt+X` (Mac)

**Opção B: Executar um por vez**

1. Execute cada comando `ALTER TYPE` separadamente:
   ```sql
   ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'tiktok_embed';
   ```
2. Execute o próximo:
   ```sql
   ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'spotify_embed';
   ```
3. E assim por diante...

### 4. Verificar se Funcionou

Execute a query de verificação:

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

**Você deve ver os novos valores na lista:**
- `tiktok_embed`
- `spotify_embed`
- `linkedin_embed`
- `pinterest_embed`

### 5. Testar

Após executar a migration:

1. Acesse o dashboard: `http://127.0.0.1:5500/dashboard.html`
2. Tente criar um item do tipo "Spotify Incorporado" ou "TikTok Incorporado"
3. Deve funcionar sem erro!

---

## ⚠️ Possíveis Erros

### Erro: "ALTER TYPE ... ADD VALUE cannot be run inside a transaction block"

**Solução:** Execute cada comando `ALTER TYPE` separadamente (um por vez)

### Erro: "value already exists"

**Solução:** Isso é normal! O `IF NOT EXISTS` deve evitar esse erro, mas se aparecer, pode ignorar - significa que já foi adicionado.

### Erro de Conexão SSL

**Solução:** Configure o DBeaver para usar SSL:
- Na conexão → SSL tab → Marque "Use SSL"
- SSL Mode: `require` ou `prefer`

---

## 📞 Precisa de Ajuda?

Se tiver problemas:
1. Verifique se está conectado ao banco correto do Render
2. Verifique as credenciais de conexão
3. Certifique-se de que está executando no banco de dados correto (não em outro banco)

