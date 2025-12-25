# 🚨 URGENTE: Executar Migration - Tabela password_reset_tokens

## 📋 Problema Identificado

Os logs do Render mostram claramente:

```
ERROR: relation "password_reset_tokens" does not exist
code: "42P01"
```

**Isso significa que a tabela `password_reset_tokens` não existe no banco de dados do Render.**

---

## ✅ Solução: Executar Migration SQL

### **Opção 1: Usando DBeaver ou psql (Recomendado)**

1. **Conecte ao banco PostgreSQL do Render:**
   - Host: `virginia-postgres.render.com`
   - Database: `conecta_king_db`
   - User: `conecta_king_db_user`
   - Password: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
   - Port: `5432`

2. **Execute este SQL:**

```sql
-- Criar tabela password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

3. **Verifique se foi criada:**

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'password_reset_tokens'
);
```

Deve retornar `true`.

---

### **Opção 2: Usando Render Dashboard (Se disponível)**

Alguns planos do Render têm acesso a um console SQL. Se disponível:

1. Acesse o dashboard do Render
2. Vá para o banco PostgreSQL
3. Procure por "SQL Editor" ou "Query Tool"
4. Execute o SQL acima

---

### **Opção 3: Usando psql via Terminal**

```bash
psql -h virginia-postgres.render.com -U conecta_king_db_user -d conecta_king_db -p 5432
```

Quando solicitado, digite a senha: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`

Depois execute o SQL:

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

---

## 🔍 Verificação

Após executar, verifique:

1. **Se a tabela foi criada:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'password_reset_tokens';
```

2. **Se os índices foram criados:**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'password_reset_tokens';
```

Deve retornar 4 índices:
- `password_reset_tokens_pkey` (PRIMARY KEY)
- `idx_password_reset_tokens_token`
- `idx_password_reset_tokens_user_id`
- `idx_password_reset_tokens_expires_at`

---

## ✅ Após Executar

1. **Aguarde alguns segundos** para o banco processar
2. **Teste novamente** a recuperação de senha em: https://conectaking.com.br/recuperar-senha.html
3. **Verifique os logs do Render** - não deve mais aparecer o erro `relation "password_reset_tokens" does not exist`

---

## 📝 SQL Completo (Copy/Paste)

Copie e cole este SQL completo:

```sql
-- ============================================
-- MIGRATION: Criar tabela password_reset_tokens
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

**IMPORTANTE:** Execute este SQL o quanto antes para corrigir o erro 500!

