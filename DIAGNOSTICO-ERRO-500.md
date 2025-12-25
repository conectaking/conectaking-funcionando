# 🔍 Diagnóstico de Erro 500 - Recuperação de Senha

## 📋 Status Atual

✅ **Progresso:** O erro mudou de **404** para **500**
- ✅ Servidor está rodando
- ✅ Rota `/api/password/forgot` foi encontrada
- ❌ Erro interno ocorrendo durante a execução

---

## 🔍 Como Diagnosticar

### **1. Verificar Logs do Render**

1. Acesse: https://dashboard.render.com
2. Vá para o serviço `conectaking-api`
3. Clique em **"Logs"**
4. Procure por erros recentes (últimos minutos)

**O que procurar:**
- `Error:` seguido de uma mensagem específica
- `TypeError:` indica erro de tipo
- `ReferenceError:` indica variável não definida
- Mensagens relacionadas a:
  - `db.query`
  - `generatePasswordResetToken`
  - `savePasswordResetToken`
  - `sendPasswordResetEmail`
  - Variáveis de ambiente

---

## 🚨 Possíveis Causas e Soluções

### **Causa 1: Variáveis de Ambiente Faltando**

**Sintomas nos logs:**
- `SMTP_USER is not defined`
- `DB_HOST is not defined`
- `process.env.XXX is undefined`

**Solução:**
1. Vá em **Settings** → **Environment**
2. Verifique se estas variáveis estão configuradas:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
   - `FRONTEND_URL`
   - `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`

---

### **Causa 2: Erro de Conexão com Banco de Dados**

**Sintomas nos logs:**
- `connection refused`
- `timeout`
- `ECONNREFUSED`
- `Error executing query`

**Solução:**
1. Verifique se as variáveis de banco estão corretas
2. Verifique se o banco PostgreSQL está acessível
3. Verifique se há firewall bloqueando a conexão

---

### **Causa 3: Erro ao Enviar Email (SMTP)**

**Sintomas nos logs:**
- `Invalid login`
- `Authentication failed`
- `SMTP connection error`
- Erro relacionado a `nodemailer`

**Solução:**
1. Verifique credenciais SMTP no Render
2. Verifique se `SMTP_USER` e `SMTP_PASS` estão corretos
3. Para Gmail, certifique-se de usar "Senha de App" (não a senha normal)

---

### **Causa 4: Tabela `password_reset_tokens` Não Existe**

**Sintomas nos logs:**
- `relation "password_reset_tokens" does not exist`
- `table "password_reset_tokens" does not exist`

**Solução:**
1. Execute a migration SQL no banco de dados:
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

### **Causa 5: Erro em Alguma Função de Utilitário**

**Sintomas nos logs:**
- `Cannot read property 'XXX' of undefined`
- `XXX is not a function`
- Stack trace apontando para `utils/password.js` ou `utils/email.js`

**Solução:**
1. Verifique se todos os arquivos `utils/` estão no repositório
2. Verifique se há erros de sintaxe nos arquivos
3. Verifique se todas as dependências estão instaladas

---

## 🛠️ Passos de Verificação

### **Passo 1: Verificar Logs Completos**

Copie o erro completo dos logs e identifique:
- Qual é a mensagem de erro?
- Onde está ocorrendo (stack trace)?
- Qual módulo/função está falhando?

---

### **Passo 2: Verificar Variáveis de Ambiente**

No Render, vá em **Settings** → **Environment** e confirme:

**Obrigatórias:**
- [ ] `DB_USER`
- [ ] `DB_HOST`
- [ ] `DB_DATABASE`
- [ ] `DB_PASSWORD`
- [ ] `DB_PORT`
- [ ] `JWT_SECRET`

**Para Recuperação de Senha:**
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASS`
- [ ] `SMTP_FROM`
- [ ] `FRONTEND_URL`

---

### **Passo 3: Verificar Tabela no Banco**

Execute esta query no banco PostgreSQL:

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'password_reset_tokens'
);
```

Se retornar `false`, execute a migration SQL acima.

---

### **Passo 4: Testar Conexão SMTP**

Se possível, teste as credenciais SMTP localmente ou verifique nos logs se há erros específicos de autenticação.

---

## 📝 Checklist de Diagnóstico

- [ ] Logs do Render foram verificados
- [ ] Erro específico foi identificado
- [ ] Variáveis de ambiente estão configuradas
- [ ] Banco de dados está acessível
- [ ] Tabela `password_reset_tokens` existe
- [ ] Credenciais SMTP estão corretas
- [ ] Todos os arquivos `utils/` estão no repositório

---

## 🔄 Próximos Passos

1. **Copie o erro completo dos logs do Render**
2. **Identifique a causa específica** usando este guia
3. **Aplique a solução correspondente**
4. **Teste novamente** após corrigir

---

**Importante:** O erro 500 indica que o código está sendo executado, mas algo está falhando. Os logs do Render vão mostrar exatamente o que está errado.

