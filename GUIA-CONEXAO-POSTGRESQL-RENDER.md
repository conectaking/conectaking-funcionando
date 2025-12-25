# 🔌 Guia Completo: Como Conectar ao PostgreSQL do Render

## 📋 Informações de Conexão

**Credenciais do Banco:**
- **Host:** `virginia-postgres.render.com`
- **Database:** `conecta_king_db`
- **User:** `conecta_king_db_user`
- **Password:** `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
- **Port:** `5432`

---

## 🛠️ Opção 1: Usando DBeaver (Mais Fácil - Recomendado)

### **Passo 1: Instalar DBeaver**

1. Baixe o DBeaver: https://dbeaver.io/download/
2. Instale o software
3. Abra o DBeaver

### **Passo 2: Criar Nova Conexão**

1. Clique no botão **"Nova Conexão"** (ou `Ctrl+Shift+N`)
2. Selecione **"PostgreSQL"** na lista
3. Clique em **"Próximo"**

### **Passo 3: Configurar Conexão**

Preencha os campos:

- **Host:** `virginia-postgres.render.com`
- **Port:** `5432`
- **Database:** `conecta_king_db`
- **Username:** `conecta_king_db_user`
- **Password:** `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`

### **Passo 4: Testar e Salvar**

1. Clique em **"Testar Conexão"**
2. Se aparecer uma mensagem pedindo para baixar drivers, clique em **"Baixar"**
3. Aguarde o download e teste novamente
4. Se conectar com sucesso, clique em **"Finalizar"**

### **Passo 5: Executar SQL**

1. Clique com botão direito na conexão → **"SQL Editor"** → **"Novo Editor SQL"**
2. Cole o SQL da migration
3. Clique em **"Execute SQL Script"** (ou `Ctrl+Enter`)

---

## 🖥️ Opção 2: Usando psql (Terminal/Command Line)

### **Windows (PowerShell ou CMD):**

1. **Instale o PostgreSQL** (se não tiver):
   - Baixe: https://www.postgresql.org/download/windows/
   - Ou use o Chocolatey: `choco install postgresql`

2. **Abra o PowerShell ou CMD**

3. **Execute o comando:**

```bash
psql -h virginia-postgres.render.com -U conecta_king_db_user -d conecta_king_db -p 5432
```

4. **Quando solicitado, digite a senha:**
```
Password: LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg
```

5. **Após conectar, execute o SQL:**

```sql
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

6. **Para sair:** Digite `\q` e pressione Enter

---

## 🌐 Opção 3: Usando pgAdmin

### **Passo 1: Instalar pgAdmin**

1. Baixe: https://www.pgadmin.org/download/
2. Instale e abra o pgAdmin

### **Passo 2: Criar Servidor**

1. Clique com botão direito em **"Servers"** → **"Create"** → **"Server"**
2. Na aba **"General"**, dê um nome (ex: "Render PostgreSQL")
3. Na aba **"Connection"**, preencha:
   - **Host:** `virginia-postgres.render.com`
   - **Port:** `5432`
   - **Database:** `conecta_king_db`
   - **Username:** `conecta_king_db_user`
   - **Password:** `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
4. Clique em **"Save"**

### **Passo 3: Executar SQL**

1. Expanda o servidor → **"Databases"** → `conecta_king_db`
2. Clique com botão direito → **"Query Tool"**
3. Cole o SQL da migration
4. Clique em **"Execute"** (ou `F5`)

---

## 💻 Opção 4: String de Conexão (Para aplicações)

Se precisar usar em código, use esta string de conexão:

```
postgresql://conecta_king_db_user:LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg@virginia-postgres.render.com:5432/conecta_king_db
```

---

## 🔐 Opção 5: Usando Render Dashboard (Se disponível)

Alguns planos do Render oferecem acesso direto:

1. Acesse: https://dashboard.render.com
2. Vá para o serviço PostgreSQL
3. Procure por **"Connection Info"** ou **"Connect"**
4. Alguns planos têm **"SQL Editor"** ou **"Query Tool"** integrado

---

## ✅ Verificação Após Conectar

Depois de conectar, execute este SQL para verificar se a tabela foi criada:

```sql
-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'password_reset_tokens'
);

-- Ver estrutura da tabela (se existir)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_tokens';

-- Ver índices criados
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'password_reset_tokens';
```

---

## 📝 SQL Completo da Migration

Copie e cole este SQL completo:

```sql
-- ============================================
-- Migration: Criar tabela password_reset_tokens
-- ============================================

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

-- Verificação
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'password_reset_tokens'
) AS table_exists;
```

---

## ⚠️ Problemas Comuns

### **Erro: "Connection refused"**

**Causa:** Firewall ou rede bloqueando a conexão
**Solução:** 
- Verifique sua conexão com internet
- Alguns lugares bloqueiam conexões PostgreSQL externas

### **Erro: "Authentication failed"**

**Causa:** Credenciais incorretas
**Solução:**
- Verifique se copiou a senha corretamente
- A senha é: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`

### **Erro: "Database does not exist"**

**Causa:** Nome do banco incorreto
**Solução:**
- O nome correto é: `conecta_king_db` (com underscore)

### **Erro: "Timeout"**

**Causa:** Servidor pode estar sobrecarregado ou offline
**Solução:**
- Tente novamente em alguns minutos
- Verifique o status do Render: https://status.render.com

---

## 🎯 Recomendação

**Para iniciantes:** Use **DBeaver** (Opção 1) - é a mais fácil e visual.

**Para usuários avançados:** Use **psql** (Opção 2) - mais rápido via linha de comando.

---

## 📞 Ajuda Adicional

Se tiver problemas para conectar:

1. Verifique se as credenciais estão corretas
2. Verifique sua conexão com internet
3. Tente desabilitar temporariamente o firewall
4. Verifique se o banco PostgreSQL está ativo no Render

---

**Boa sorte!** 🚀

