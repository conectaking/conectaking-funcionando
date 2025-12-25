# ⚠️ Variáveis que Estão Faltando no Render

## ✅ Variáveis Já Configuradas (Confirmadas):
- ✅ SMTP_HOST
- ✅ SMTP_PORT
- ✅ SMTP_SECURE
- ✅ SMTP_USER
- ✅ SMTP_PASS
- ✅ SMTP_FROM

---

## ❌ Variáveis que FALTAM Adicionar:

### **1. FRONTEND_URL (IMPORTANTE para links no email)**

```
Key: FRONTEND_URL
Value: https://conectaking.com.br
```

**Por quê?**  
Esta variável é usada para gerar o link de reset no email. Se não estiver configurada, o link no email pode estar errado.

---

### **2. Verificar estas variáveis também:**

Certifique-se de que estas estão configuradas (podem estar escondidas no "Show more"):

#### **Banco de Dados:**
```
DB_USER = conecta_king_db_user
DB_HOST = virginia-postgres.render.com
DB_DATABASE = conecta_king_db
DB_PASSWORD = LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg
DB_PORT = 5432
```

#### **JWT:**
```
JWT_SECRET = vCLrK0pbiOarew1iWG2CevIoG1jgYvx5tv8g2nz1A2Jxi4BOLh
```

#### **Ambiente:**
```
NODE_ENV = production
```

#### **Outras URLs (se necessário):**
```
API_URL = https://conectaking-api.onrender.com
PUBLIC_PROFILE_URL = https://tag.conectaking.com.br
```

---

## 🎯 AÇÃO NECESSÁRIA:

### **Adicionar FRONTEND_URL:**

1. No painel do Render, na página de Environment Variables
2. Clique em **"Add Environment Variable"** (ou botão similar)
3. Adicione:
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://conectaking.com.br`
4. Clique em **"Save"**

---

## ✅ Checklist:

- [x] SMTP_HOST ✅
- [x] SMTP_PORT ✅
- [x] SMTP_SECURE ✅
- [x] SMTP_USER ✅
- [x] SMTP_PASS ✅
- [x] SMTP_FROM ✅
- [ ] **FRONTEND_URL** ⚠️ **FALTA ADICIONAR**
- [ ] DB_USER (verificar se está)
- [ ] DB_HOST (verificar se está)
- [ ] DB_DATABASE (verificar se está)
- [ ] DB_PASSWORD (verificar se está)
- [ ] JWT_SECRET (verificar se está)
- [ ] NODE_ENV (verificar se está)

---

## 📝 Como Adicionar no Render:

1. Na página de Environment Variables que você está vendo
2. Procure por um botão **"Add Environment Variable"** ou **"Add"** ou **"+"**
3. Preencha:
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://conectaking.com.br`
4. Salve

**Após adicionar, o servidor reiniciará automaticamente!**

---

## ⚠️ IMPORTANTE:

A variável **FRONTEND_URL** é essencial porque:
- É usada em `utils/email.js` para gerar o link de reset
- Se não estiver configurada, o link no email pode estar quebrado
- O sistema pode não funcionar corretamente

**Adicione essa variável agora!**

