# 🔧 Solução para Erro "Cannot POST /api/password/forgot"

## 📋 Diagnóstico

O erro **"Cannot POST /api/password/forgot"** indica que o servidor Render não está conseguindo encontrar a rota. Isso pode acontecer por alguns motivos:

### Possíveis Causas:

1. **Servidor não foi reiniciado após deploy**
2. **Erro ao carregar módulos** (impede o servidor de iniciar)
3. **Arquivos não foram deployados corretamente**
4. **Estrutura de diretórios diferente no repositório**

---

## ✅ Soluções

### **1. Verificar Logs do Render**

1. Acesse o dashboard do Render: https://dashboard.render.com
2. Vá para o serviço `conectaking-api`
3. Clique em **"Logs"** no menu lateral
4. Procure por erros relacionados a:
   - `routes/password.js`
   - `Cannot find module`
   - `Error loading`
   - `SyntaxError`

**O que procurar:**
- Se houver erro ao carregar `routes/password.js`, significa que algum módulo não foi encontrado
- Se não houver erros, o servidor pode não ter reiniciado

---

### **2. Forçar Reinicialização do Servidor**

No dashboard do Render:

1. Vá para o serviço `conectaking-api`
2. Clique em **"Manual Deploy"** → **"Deploy latest commit"**
3. Ou clique no botão **"Restart"** (se disponível)

Isso força o servidor a reiniciar e recarregar todas as rotas.

---

### **3. Verificar se Arquivos Foram Commitados**

Execute localmente:

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\backend-conecta-king"
git log --oneline --all -- routes/password.js utils/password.js utils/email.js utils/validation.js
```

Se não aparecer nada, os arquivos não foram commitados. Faça:

```bash
git add routes/password.js utils/password.js utils/email.js utils/validation.js middleware/security.js
git commit -m "Fix: Garante que sistema de recuperação de senha esteja disponível"
git push origin main
```

---

### **4. Verificar Estrutura no Bitbucket**

1. Acesse: https://bitbucket.org/conecta-king-backend/conecta-king-backend/src/main/
2. Verifique se os arquivos estão presentes:
   - `routes/password.js`
   - `utils/password.js`
   - `utils/email.js`
   - `utils/validation.js`
   - `middleware/security.js`

**IMPORTANTE:** Se a estrutura no Bitbucket for `src/main/routes/` mas localmente for apenas `routes/`, isso pode causar problemas. Verifique a estrutura.

---

### **5. Testar Rota Manualmente**

Após reiniciar o servidor, teste a rota:

```bash
curl -X POST https://conectaking-api.onrender.com/api/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com"}'
```

Ou acesse diretamente no navegador (vai dar erro 404 se a rota não existir):
```
https://conectaking-api.onrender.com/api/password/forgot
```

---

### **6. Verificar Se Há Erro de Inicialização**

Os logs do Render devem mostrar algo como:

```
👑 Servidor Conecta King rodando na porta 5000 (production)
```

Se não aparecer essa mensagem, o servidor não está iniciando corretamente.

---

## 🎯 Passos Imediatos Recomendados

1. ✅ **Verificar logs do Render** (prioridade máxima)
2. ✅ **Forçar redeploy manual** no Render
3. ✅ **Verificar se arquivos estão no Bitbucket**
4. ✅ **Testar a rota após reiniciar**

---

## 📝 Checklist de Verificação

- [ ] Logs do Render não mostram erros de carregamento
- [ ] Servidor mostra mensagem de inicialização nos logs
- [ ] Arquivo `routes/password.js` existe no Bitbucket
- [ ] Arquivo `server.js` tem a linha: `app.use('/api/password', passwordRoutes);`
- [ ] Variáveis de ambiente SMTP estão configuradas no Render
- [ ] Tabela `password_reset_tokens` existe no banco de dados

---

## ⚠️ Se Nada Funcionar

Se após todos esses passos o erro persistir:

1. **Verifique se o Render está conectado ao repositório correto:**
   - Vá em Settings → Build & Deploy
   - Verifique o "Repository" e "Branch"

2. **Verifique o "Build Command" e "Start Command":**
   - Build Command: `npm install` (ou deixe em branco)
   - Start Command: `node server.js` (ou `npm start`)

3. **Limpe o cache do Render:**
   - Vá em Settings → Environment
   - Procure por opção de limpar cache (pode não existir)
   - Ou crie um novo serviço como teste

---

## 📞 Informações Úteis

- **URL da API:** https://conectaking-api.onrender.com
- **Rota esperada:** POST `/api/password/forgot`
- **Repositório:** https://bitbucket.org/conecta-king-backend/conecta-king-backend

---

**Data:** Dezembro 2024
**Status:** Aguardando verificação dos logs do Render

