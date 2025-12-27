# 📝 COMO PREENCHER A CONEXÃO SQLTOOLS - PASSO A PASSO

## 🎯 Dados que você precisa do Render

1. Acesse seu **Render Dashboard** → **PostgreSQL** → **Seu banco**
2. Copie os dados de conexão (estão na aba "Connections" ou "Info")

---

## ✅ PREENCHER OS CAMPOS

### **Tela 1: Connection Settings**

| Campo | O que colocar | Exemplo |
|-------|---------------|---------|
| **Connection name*** | Nome qualquer para identificar | `Conecta King DB` |
| **Connection group** | (deixe vazio ou coloque "Render") | `Render` |
| **Connect using*** | Deixe como está | `Server and Port` |
| **Server Address*** | Host do Render | `virginia-postgres.render.com` |
| **Port*** | Porta do PostgreSQL | `5432` |
| **Database*** | Nome do banco | `conecta_king_db` |
| **Username*** | Usuário do Render | `conecta_king_db_user` |
| **Use password** | Clique e escolha | `Save as plaintext in settings` |
| **Password*** | **Sua senha do Render** | `••••••••` (cole sua senha aqui) |

### **Tela 2: node-pg driver specific options**

| Campo | O que colocar | Importante |
|-------|---------------|------------|
| **SSL** | ⚠️ **MUDE PARA:** `require` ou `prefer` | **CRÍTICO!** Não deixe "Disabled" |
| **statement_timeout** | (deixe vazio) | - |

### **Tela 3: Outras configurações**

| Campo | O que colocar |
|-------|---------------|
| **Over SSH** | Deixe como está: `Disabled` |
| **Connection Timeout** | (deixe vazio) |
| **Show records default limit** | Deixe `50` |

---

## 🚀 DEPOIS DE PREENCHER

1. ✅ Clique em **"SAVE CONNECTION"**
2. ✅ Clique em **"TEST CONNECTION"**
3. ✅ Se aparecer ✅ **"Connection successful"**, está pronto!

---

## ❓ ONDE PEGAR A SENHA?

1. Acesse: https://dashboard.render.com
2. Vá em **"PostgreSQL"** → Seu banco `conecta_king_db`
3. Procure por **"Connections"** ou **"Info"**
4. Copie a **senha** (password)

**OU**

Se você já tem a senha salva em algum lugar do projeto, procure por arquivos `.env` ou configurações.

---

## ⚠️ IMPORTANTE

- **SSL:** **SEMPRE** use `require` ou `prefer` (nunca "Disabled")
- **Password:** Cole a senha completa do Render
- **Server:** Use o host completo do Render (não localhost)

Me avise quando preencher e testar! 🎯

