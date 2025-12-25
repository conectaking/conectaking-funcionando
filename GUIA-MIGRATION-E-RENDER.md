# 📋 Guia Completo: Migration SQL e Variáveis no Render

## 🗄️ PARTE 1: Executar Migration SQL

### **Opção 1: Via Render Dashboard (Mais Fácil)**

Se você tiver acesso ao banco de dados PostgreSQL no Render:

1. **Acesse o Render Dashboard:**
   - Vá para: https://dashboard.render.com
   - Faça login

2. **Encontre seu banco de dados:**
   - Procure pelo serviço PostgreSQL (ex: "conecta-king-db")
   - Clique nele

3. **Acesse o banco:**
   - Vá na aba **"Connect"** ou **"Info"**
   - Copie as informações de conexão (Host, Database, User, Password)

4. **Use o PostgreSQL Shell ou um cliente:**
   - **Opção A:** Use o terminal do Render (se disponível)
   - **Opção B:** Use um cliente PostgreSQL como pgAdmin, DBeaver, ou psql

5. **Execute o SQL:**
   - Abra o arquivo: `migrations/003_create_password_reset_tokens_table.sql`
   - Copie todo o conteúdo SQL
   - Execute no banco de dados

---

### **Opção 2: Via Terminal (psql)**

Se você tem acesso ao terminal e ao banco:

1. **Instale o PostgreSQL Client** (se não tiver):
   - Windows: Baixe do site oficial do PostgreSQL
   - Ou use o psql que vem com a instalação

2. **Conecte ao banco:**
   ```bash
   psql -h virginia-postgres.render.com -U conecta_king_db_user -d conecta_king_db
   ```
   (Vai pedir a senha: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`)

3. **Execute o SQL:**
   ```sql
   -- Cole e execute todo o conteúdo do arquivo migration
   CREATE TABLE IF NOT EXISTS password_reset_tokens (
       id SERIAL PRIMARY KEY,
       user_id VARCHAR(255) NOT NULL,
       token TEXT NOT NULL UNIQUE,
       expires_at TIMESTAMP NOT NULL,
       created_at TIMESTAMP DEFAULT NOW(),
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

   CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
   CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
   CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
   ```

4. **Verifique se foi criada:**
   ```sql
   \dt password_reset_tokens
   ```

5. **Saia do psql:**
   ```sql
   \q
   ```

---

### **Opção 3: Via Cliente Gráfico (pgAdmin, DBeaver, etc.)**

1. **Conecte ao banco:**
   - Host: `virginia-postgres.render.com`
   - Database: `conecta_king_db`
   - User: `conecta_king_db_user`
   - Password: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
   - Port: `5432` (padrão PostgreSQL)

2. **Abra uma Query/Editor SQL**

3. **Cole e execute o conteúdo de:**
   `migrations/003_create_password_reset_tokens_table.sql`

4. **Execute a query**

---

### **Opção 4: Via Script Node.js (Automático)**

Se preferir automatizar, você pode usar o script que já existe:

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\backend-conecta-king"
npm run migrate
```

**Mas primeiro**, verifique se o script `scripts/run-migrations.js` está configurado corretamente.

---

## ⚙️ PARTE 2: Configurar Variáveis no Render

### **Passo a Passo Detalhado:**

1. **Acesse o Render Dashboard:**
   - Vá para: https://dashboard.render.com
   - Faça login

2. **Encontre seu serviço da API:**
   - Procure pelo serviço (ex: "conectaking-api" ou similar)
   - Clique nele

3. **Vá para Environment:**
   - No menu lateral, clique em **"Environment"**
   - Ou vá em **"Settings" → "Environment Variables"**

4. **Adicione/Edite as Variáveis:**

   Clique em **"Add Environment Variable"** ou edite as existentes:

   #### **Variáveis SMTP (Email Gmail):**
   
   ```
   SMTP_HOST = smtp.gmail.com
   ```
   
   ```
   SMTP_PORT = 587
   ```
   
   ```
   SMTP_SECURE = false
   ```
   
   ```
   SMTP_USER = conectaking@gmail.com
   ```
   
   ```
   SMTP_PASS = imhr ogpa zeqg scms
   ```
   
   ```
   SMTP_FROM = noreply@conectaking.com.br
   ```

   #### **Variável de URL do Frontend:**
   
   ```
   FRONTEND_URL = https://conectaking.com.br
   ```
   
   (Ou ajuste para o domínio correto se for diferente)

5. **Verifique outras variáveis importantes:**

   Certifique-se de que estas também estão configuradas:
   
   ```
   DB_USER = conecta_king_db_user
   DB_HOST = virginia-postgres.render.com
   DB_DATABASE = conecta_king_db
   DB_PASSWORD = LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg
   DB_PORT = 5432
   ```
   
   ```
   JWT_SECRET = vCLrK0pbiOarew1iWG2CevIoG1jgYvx5tv8g2nz1A2Jxi4BOLh
   ```
   
   ```
   NODE_ENV = production
   ```

6. **Salve as alterações:**
   - Clique em **"Save Changes"** ou **"Apply"**
   - O Render vai reiniciar o serviço automaticamente

7. **Aguarde o restart:**
   - Vá na aba **"Logs"**
   - Aguarde o servidor reiniciar (1-2 minutos)
   - Procure por: "Servidor rodando na porta..."

---

## ✅ Verificação Final

### **1. Verificar se a Migration foi executada:**

Conecte ao banco e execute:
```sql
SELECT * FROM password_reset_tokens LIMIT 1;
```

Se não der erro, a tabela existe! ✅

---

### **2. Verificar se as Variáveis estão configuradas:**

No Render, na aba **"Logs"**, procure por mensagens de erro relacionadas a:
- "SMTP_USER não configurado"
- "Email transporter não configurado"

Se não houver esses erros, as variáveis estão OK! ✅

---

### **3. Testar o Sistema:**

1. **Teste Health Check:**
   ```
   https://conectaking-api.onrender.com/api/health
   ```
   Deve retornar JSON com `"status": "ok"`

2. **Teste Recuperação de Senha:**
   - Acesse: `https://conectaking.com.br/recuperar-senha.html`
   - Digite um email válido
   - Verifique se recebe o email

---

## 📝 Checklist Rápido

- [ ] Migration SQL executada (tabela `password_reset_tokens` criada)
- [ ] Variáveis SMTP configuradas no Render:
  - [ ] SMTP_HOST
  - [ ] SMTP_PORT
  - [ ] SMTP_SECURE
  - [ ] SMTP_USER
  - [ ] SMTP_PASS
  - [ ] SMTP_FROM
- [ ] FRONTEND_URL configurada
- [ ] Servidor reiniciado no Render
- [ ] Teste de health check funcionando
- [ ] Teste de recuperação de senha funcionando

---

## 🆘 Troubleshooting

### Problema: Migration não executa

**Solução:**
- Verifique se você tem permissão no banco
- Verifique se a conexão está correta
- Tente executar cada comando SQL separadamente

### Problema: Variáveis não funcionam

**Solução:**
- Verifique se salvou as alterações no Render
- Verifique se o servidor foi reiniciado
- Verifique os logs para erros específicos

### Problema: Email não é enviado

**Solução:**
- Verifique se as credenciais SMTP estão corretas
- Verifique se a senha de app do Gmail está correta
- Verifique os logs do servidor para erros de SMTP

---

## 🎯 Resumo dos Dados

### **Banco de Dados:**
- Host: `virginia-postgres.render.com`
- Database: `conecta_king_db`
- User: `conecta_king_db_user`
- Password: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`

### **Gmail SMTP:**
- User: `conectaking@gmail.com`
- Password (App): `imhr ogpa zeqg scms`

---

**Após fazer isso, o sistema de recuperação de senha estará 100% funcional!** 🎉

