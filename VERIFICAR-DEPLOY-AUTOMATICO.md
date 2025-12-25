# ✅ Verificação de Deploy Automático no Render

## 📋 Como Verificar se o Deploy Automático Está Configurado

### **Passo 1: Acessar o Painel do Render**

1. Acesse: https://dashboard.render.com
2. Faça login na sua conta
3. Procure pelo serviço da API: `conectaking-api` ou similar

---

### **Passo 2: Verificar Configuração do Repositório**

No painel do seu serviço, vá em **"Settings"** → **"Build & Deploy"**:

#### ✅ **Deve estar configurado:**
- **Repository**: `conecta-king-backend/conecta-king-backend`
- **Branch**: `main` (ou `master`)
- **Root Directory**: (geralmente vazio ou `/`)

---

### **Passo 3: Verificar Auto-Deploy**

Na mesma página de **"Settings"** → **"Build & Deploy"**, procure por:

#### **Auto-Deploy Settings:**

- ✅ **"On Commit"** - Deploy automático quando há push (RECOMENDADO)
- ⚠️ **"After CI Checks Pass"** - Deploy após testes
- ❌ **"Off"** - Deploy manual apenas (NÃO RECOMENDADO)

**Para ativar/verificar:**
1. Vá em **Settings** → **Build & Deploy**
2. Na seção **"Auto-Deploy"**
3. Selecione **"On Commit"**
4. Salve as alterações

---

### **Passo 4: Testar o Deploy Automático**

Para verificar se está funcionando:

1. **Faça uma pequena alteração no código:**
   ```bash
   # No terminal, dentro de backend-conecta-king
   echo "// Test deploy" >> server.js
   git add server.js
   git commit -m "Test: Verificar deploy automático"
   git push origin main
   ```

2. **Acompanhe no Render:**
   - Volte ao painel do Render
   - Vá na aba **"Events"** ou **"Deploys"**
   - Você deve ver um novo deploy sendo iniciado automaticamente
   - Aguarde 2-5 minutos para completar

3. **Verifique os logs:**
   - Na aba **"Logs"**
   - Procure por mensagens de build e deploy

---

### **Passo 5: Verificar Status Atual**

#### **Verificar se a API está funcionando:**

```bash
# No PowerShell ou navegador, acesse:
https://conectaking-api.onrender.com/api/health
```

**Deve retornar:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...,
  "environment": "production"
}
```

---

## ✅ Checklist de Verificação

Marque os itens que estão corretos:

- [ ] Render conectado ao repositório Bitbucket
- [ ] Branch configurada corretamente (`main`)
- [ ] Auto-Deploy configurado como **"On Commit"**
- [ ] Último commit do repositório aparece nos logs
- [ ] API respondendo corretamente (`/api/health`)
- [ ] Deploy mais recente foi automático (não manual)

---

## 🔧 Se o Deploy Automático NÃO Estiver Configurado

### **Como Configurar:**

1. **No painel do Render:**
   - Vá para **Settings** → **Build & Deploy**
   - Role até **"Auto-Deploy"**
   - Selecione **"On Commit"**
   - Clique em **Save Changes**

2. **Verificar conexão com Bitbucket:**
   - Em **Settings** → **Build & Deploy**
   - Verifique se o repositório está conectado
   - Se não estiver, clique em **"Connect Repository"**
   - Autorize o Render a acessar seu Bitbucket

3. **Testar:**
   - Faça um push para o repositório
   - Verifique se o deploy inicia automaticamente

---

## 📊 Status Atual do Repositório

**Repositório:** `https://bitbucket.org/conecta-king-backend/conecta-king-backend.git`  
**Branch:** `main`  
**Último commit local:** Verifique com `git log -1`  
**Status Git:** `Everything up-to-date` (já sincronizado)

---

## 🚨 Problemas Comuns

### **Problema: Deploy não inicia automaticamente**

**Possíveis causas:**
- Auto-Deploy está desabilitado
- Branch configurada incorretamente
- Render não tem acesso ao repositório
- Erro na configuração do serviço

**Solução:**
1. Verifique se Auto-Deploy está como **"On Commit"**
2. Confirme que a branch é `main`
3. Re-autorize o acesso do Render ao Bitbucket
4. Verifique os logs para erros

### **Problema: Deploy falha automaticamente**

**Possíveis causas:**
- Erro de build
- Variáveis de ambiente faltando
- Dependências não instaladas
- Erro no código

**Solução:**
1. Veja os logs de erro no Render
2. Verifique se todas as dependências estão no `package.json`
3. Teste localmente antes de fazer push
4. Verifique variáveis de ambiente

---

## 📞 Próximos Passos

Após verificar a configuração:

1. ✅ Se Auto-Deploy estiver **ON**: Tudo certo! Faça push normalmente.
2. ⚠️ Se Auto-Deploy estiver **OFF**: Ative em Settings → Build & Deploy
3. 🔄 Se precisar reconfigurar: Siga os passos acima

---

**Data da verificação:** 21/12/2025
