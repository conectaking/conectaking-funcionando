# ⚡ Solução Rápida - Erro "Missing required parameter: client_id"

## 🔴 Problema

Você está vendo o erro:
```
Missing required parameter: client_id
Erro 400: invalid_request
```

## ✅ Solução em 5 Minutos

### 1. Criar Credenciais no Google Cloud Console (3 min)

1. Acesse: https://console.cloud.google.com
2. Clique em **"Selecionar projeto"** > **"Novo Projeto"**
3. Nome: `Conecta King Agenda` > **"Criar"**
4. No menu lateral: **"APIs e Serviços"** > **"Biblioteca"**
5. Procure: **"Google Calendar API"** > **"Ativar"**
6. **"APIs e Serviços"** > **"Credenciais"**
7. **"Criar credenciais"** > **"ID do cliente OAuth"**
8. Tipo: **"Aplicativo da Web"**
9. Nome: `Conecta King Agenda`
10. **URIs de redirecionamento autorizados:**
    - Adicione: `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback`
    - Adicione: `https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback`
11. Clique em **"Criar"**
12. **COPIE** o **Client ID** e **Client Secret**

### 2. Configurar no Render.com (1 min)

1. Acesse: https://dashboard.render.com
2. Selecione seu serviço
3. Vá em **"Environment"**
4. Clique em **"Add Environment Variable"**
5. Adicione:

```
GOOGLE_CLIENT_ID = [cole o Client ID aqui]
```

```
GOOGLE_CLIENT_SECRET = [cole o Client Secret aqui]
```

6. Clique em **"Save Changes"**

### 3. Fazer Deploy (1 min)

1. No Render, clique em **"Manual Deploy"** > **"Deploy latest commit"**
2. Aguarde o deploy terminar

### 4. Testar

1. Acesse seu dashboard
2. Vá em "Agenda Inteligente"
3. Clique em "Conectar Google Calendar"
4. Deve funcionar! ✅

---

## 🔧 Para Desenvolvimento Local

Adicione no arquivo `.env` na raiz do projeto:

```env
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI_OWNER=http://localhost:5000/api/oauth/agenda/google/owner/callback
GOOGLE_REDIRECT_URI_CLIENT=http://localhost:5000/api/oauth/agenda/google/client/callback
```

**Importante**: No Google Cloud Console, também adicione as URLs de `localhost` nas credenciais OAuth para desenvolvimento local.

---

## ⚠️ Se Ainda Não Funcionar

### Verificar se as variáveis foram salvas:

1. No Render, vá em **"Environment"**
2. Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` aparecem
3. Se não aparecerem, adicione novamente e faça deploy

### Verificar URLs de Callback:

As URLs no Google Cloud Console devem ser **EXATAMENTE** iguais:
- ✅ `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback`
- ❌ `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback/` (com barra no final)

### Verificar se API está habilitada:

1. No Google Cloud Console
2. **"APIs e Serviços"** > **"APIs habilitadas"**
3. Verifique se **"Google Calendar API"** está listada
4. Se não estiver, habilite

---

## 📝 Resumo

**O que você precisa:**
1. ✅ Client ID do Google
2. ✅ Client Secret do Google
3. ✅ Adicionar no Render.com
4. ✅ Fazer deploy

**Tempo total: ~5 minutos**

---

## 🎯 URLs para Adicionar no Google Cloud Console

Copie e cole exatamente estas URLs nas credenciais OAuth:

```
https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
```

Para desenvolvimento local, também adicione:
```
http://localhost:5000/api/oauth/agenda/google/owner/callback
http://localhost:5000/api/oauth/agenda/google/client/callback
```

---

## ✅ Pronto!

Após configurar, a conexão com Google Calendar deve funcionar perfeitamente! 🎉
