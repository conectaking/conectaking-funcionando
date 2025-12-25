# 🚀 Guia Simples: Como Atualizar o Render

## 📋 Opções Disponíveis

Você tem 3 formas de atualizar o Render:

---

## **Opção 1: Via Painel do Render (Mais Fácil)**

### Se você fez as alterações direto no código do Render ou tem acesso ao painel:

1. **Acesse o Render Dashboard:**
   - Vá para: https://dashboard.render.com
   - Faça login

2. **Encontre seu serviço:**
   - Procure pelo serviço da API (provavelmente "conectaking-api" ou similar)
   - Clique nele

3. **Fazer deploy manual:**
   - Procure por **"Manual Deploy"** ou **"Trigger Deploy"** no menu
   - Clique em **"Deploy latest commit"** (se estiver conectado ao Git)
   - Ou **"Clear build cache & deploy"** se necessário

4. **Aguarde o deploy:**
   - Pode levar 2-5 minutos
   - Acompanhe os logs na aba "Logs"

---

## **Opção 2: Via Git (Se o repositório estiver configurado)**

### Se o Render está conectado ao seu repositório GitHub/GitLab:

1. **Vá para a pasta do backend no terminal:**
   ```bash
   cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\backend-conecta-king"
   ```

2. **Adicione os arquivos modificados:**
   ```bash
   git add routes/password.js
   git add utils/validation.js
   git add middleware/
   git add config/
   git add server.js
   ```

3. **Faça commit:**
   ```bash
   git commit -m "Fix: Correções recuperação de senha - validação e SMTP"
   ```

4. **Envie para o GitHub:**
   ```bash
   git push origin main
   ```
   (ou `master` se for essa a branch)

5. **O Render detecta automaticamente e faz deploy!**

---

## **Opção 3: Via Interface Web do Render (Upload Manual)**

Se não tiver Git configurado:

1. **No painel do Render, vá para seu serviço**
2. **Vá em "Settings" → "Build & Deploy"**
3. **Procure por "Manual Deploy" ou "Trigger Deploy"**
4. **Selecione a branch/commit que deseja fazer deploy**

---

## ⚙️ **IMPORTANTE: Configurar Variáveis de Ambiente**

**APÓS fazer o deploy, configure as variáveis SMTP no Render:**

1. **No painel do Render, vá para seu serviço**
2. **Clique em "Environment"** (no menu lateral)
3. **Adicione ou edite estas variáveis:**

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = conectaking@gmail.com
SMTP_PASS = imhr ogpa zeqg scms
SMTP_FROM = noreply@conectaking.com.br
```

4. **Salve e reinicie o serviço** (se necessário)

---

## ✅ **Verificar se Funcionou**

### 1. Verificar Logs:
- Vá na aba **"Logs"** do seu serviço no Render
- Procure por mensagens como:
  - ✅ "Servidor rodando na porta..."
  - ✅ "Base de dados conectada..."
  - ❌ Erros vermelhos (se houver, copie e me envie)

### 2. Testar Health Check:
Abra no navegador ou use curl:
```
https://conectaking-api.onrender.com/api/health
```

**Deve retornar:**
```json
{
  "status": "ok",
  "timestamp": "...",
  ...
}
```

### 3. Testar Recuperação de Senha:
1. Acesse a página de recuperação
2. Digite um email
3. Verifique se funciona

---

## 🔍 **Se Der Erro**

### Erro: "Cannot GET /api/health"
- **Causa:** Código ainda não foi atualizado no Render
- **Solução:** Fazer deploy novamente

### Erro: "Email não enviado"
- **Causa:** Variáveis SMTP não configuradas
- **Solução:** Adicionar variáveis no painel do Render

### Erro: "Database connection failed"
- **Causa:** Variáveis do banco incorretas
- **Solução:** Verificar DB_USER, DB_HOST, DB_PASSWORD no Render

---

## 📞 **Precisa de Ajuda?**

Se tiver problemas, me envie:
1. Screenshot dos logs do Render
2. Mensagem de erro completa
3. Qual método você tentou usar

---

## ⏱️ **Tempo Estimado**

- **Via Painel:** 2-3 minutos
- **Via Git:** 3-5 minutos (incluindo push)
- **Verificação:** 1-2 minutos

**Total:** ~5-10 minutos

