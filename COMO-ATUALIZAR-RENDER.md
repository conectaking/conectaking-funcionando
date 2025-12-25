# 🚀 Como Atualizar o Servidor no Render

## 📋 Passo a Passo Completo

### **Método 1: Atualizar via Git (Recomendado)**

O Render geralmente está conectado ao seu repositório Git (GitHub, GitLab, Bitbucket). Siga estes passos:

---

#### **PASSO 1: Verificar o Status do Git**

Abra o terminal na pasta do backend:

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\backend-conecta-king"
git status
```

Isso mostrará quais arquivos foram modificados.

---

#### **PASSO 2: Adicionar as Alterações**

```bash
git add .
```

Isso adiciona todas as alterações ao staging.

---

#### **PASSO 3: Fazer Commit**

```bash
git commit -m "Fix: Correções no sistema de recuperação de senha - validação e frontend"
```

---

#### **PASSO 4: Verificar o Repositório Remoto**

```bash
git remote -v
```

Isso mostrará para qual repositório o código será enviado (GitHub, GitLab, etc).

---

#### **PASSO 5: Enviar para o Repositório**

```bash
git push origin main
```

Ou se a branch for diferente:
```bash
git push origin master
```

**Após o push:**
- O Render detecta automaticamente as mudanças
- Inicia o processo de deploy automaticamente
- Você pode acompanhar no painel do Render

---

### **Método 2: Deploy Manual no Render (Se Git não estiver configurado)**

1. **Acesse o painel do Render:**
   - Vá para: https://dashboard.render.com
   - Faça login

2. **Encontre seu serviço:**
   - Procure pelo serviço da API (ex: "conectaking-api")
   - Clique nele

3. **Fazer deploy manual:**
   - Procure pela opção **"Manual Deploy"** ou **"Trigger Deploy"**
   - Clique em **"Deploy latest commit"** (se usar Git)
   - Ou faça upload dos arquivos manualmente

---

## ⚙️ Configurar Variáveis de Ambiente no Render

**IMPORTANTE:** Após o deploy, certifique-se de que as variáveis de ambiente estão configuradas:

### Como Configurar:

1. **No painel do Render:**
   - Vá para seu serviço da API
   - Clique em **"Environment"** ou **"Environment Variables"**

2. **Adicione/Verifique estas variáveis:**

```env
# Email SMTP - Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=conectaking@gmail.com
SMTP_PASS=imhr ogpa zeqg scms
SMTP_FROM=noreply@conectaking.com.br

# URLs
FRONTEND_URL=https://conectaking.com.br
API_URL=https://conectaking-api.onrender.com
PUBLIC_PROFILE_URL=https://tag.conectaking.com.br

# Banco de Dados (já devem estar configuradas)
DB_USER=conecta_king_db_user
DB_HOST=virginia-postgres.render.com
DB_DATABASE=conecta_king_db
DB_PASSWORD=LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg
DB_PORT=5432

# JWT (já devem estar configuradas)
JWT_SECRET=vCLrK0pbiOarew1iWG2CevIoG1jgYvx5tv8g2nz1A2Jxi4BOLh

# Ambiente
NODE_ENV=production
```

3. **Salve as alterações**
4. **Reinicie o serviço** (se necessário)

---

## ✅ Verificar se o Deploy Funcionou

### 1. Verificar Logs no Render

1. No painel do Render, vá para seu serviço
2. Clique na aba **"Logs"**
3. Verifique se:
   - ✅ O servidor iniciou sem erros
   - ✅ Não há mensagens de erro
   - ✅ Aparece "Servidor rodando na porta XXXX"

### 2. Testar Health Check

Após alguns minutos do deploy, teste:

```bash
curl https://conectaking-api.onrender.com/api/health
```

**Esperado:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...,
  "environment": "production",
  ...
}
```

### 3. Testar Recuperação de Senha

1. Acesse a página de recuperação de senha
2. Digite um email válido
3. Verifique se funciona

---

## 🔍 Troubleshooting

### Problema: Deploy falhando

**Verifique:**
- ✅ Se há erros nos logs do Render
- ✅ Se todas as dependências estão no `package.json`
- ✅ Se as variáveis de ambiente estão corretas

### Problema: Servidor não inicia

**Verifique:**
- ✅ Se a porta está configurada corretamente (Render usa a variável `PORT`)
- ✅ Se há erros de sintaxe no código
- ✅ Se o banco de dados está acessível

### Problema: Rotas não funcionam

**Verifique:**
- ✅ Se as rotas estão registradas no `server.js`
- ✅ Se o servidor foi reiniciado após as mudanças
- ✅ Se há erros nos logs

---

## 📝 Comandos Rápidos

```bash
# 1. Ir para a pasta do backend
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\backend-conecta-king"

# 2. Ver status
git status

# 3. Adicionar tudo
git add .

# 4. Fazer commit
git commit -m "Sua mensagem aqui"

# 5. Enviar para o repositório
git push origin main

# 6. Ver logs (se tiver acesso SSH, mas geralmente não é necessário)
# Os logs aparecem no painel do Render
```

---

## ⏱️ Tempo Estimado

- **Commit e Push:** 1-2 minutos
- **Deploy no Render:** 2-5 minutos
- **Verificação:** 2 minutos

**Total:** ~5-10 minutos

---

## 🎯 Checklist Final

Antes de considerar concluído:

- [ ] Código commitado e enviado para o repositório
- [ ] Deploy iniciado no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Health check funcionando (`/api/health`)
- [ ] Recuperação de senha testada e funcionando
- [ ] Logs do Render sem erros

---

**Dica:** O Render geralmente mostra uma URL de preview durante o deploy. Você pode acompanhar o progresso lá!

