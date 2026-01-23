# 🔧 Como Configurar Google OAuth para Agenda Inteligente

## ❌ Erro Atual

Você está recebendo o erro:
```
Missing required parameter: client_id
Erro 400: invalid_request
```

Isso significa que as variáveis de ambiente `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` não estão configuradas.

---

## ✅ Solução: Configurar Google OAuth

### Passo 1: Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com
2. Clique em "Selecionar projeto" > "Novo Projeto"
3. Dê um nome (ex: "Conecta King Agenda")
4. Clique em "Criar"

### Passo 2: Habilitar Google Calendar API

1. No menu lateral, vá em **"APIs e Serviços"** > **"Biblioteca"**
2. Procure por **"Google Calendar API"**
3. Clique em **"Ativar"**

### Passo 3: Criar Credenciais OAuth 2.0

1. Vá em **"APIs e Serviços"** > **"Credenciais"**
2. Clique em **"Criar credenciais"** > **"ID do cliente OAuth"**
3. Se pedir, configure a tela de consentimento OAuth:
   - Tipo de usuário: **Externo**
   - Nome do app: **Conecta King**
   - Email de suporte: seu email
   - Clique em **"Salvar e continuar"**
   - Adicione seu email como usuário de teste
   - Clique em **"Salvar e continuar"**
4. Tipo de aplicativo: **Aplicativo da Web**
5. Nome: **Conecta King Agenda**
6. **URIs de redirecionamento autorizados:**
   - Adicione: `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback`
   - Adicione: `https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback`
7. Clique em **"Criar"**
8. **Copie o Client ID e Client Secret**

### Passo 4: Configurar Variáveis de Ambiente

#### No Render.com (Produção):

1. Acesse seu serviço no Render
2. Vá em **"Environment"**
3. Adicione as variáveis:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI_OWNER=https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
GOOGLE_REDIRECT_URI_CLIENT=https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
```

#### No .env Local (Desenvolvimento):

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI_OWNER=http://localhost:5000/api/oauth/agenda/google/owner/callback
GOOGLE_REDIRECT_URI_CLIENT=http://localhost:5000/api/oauth/agenda/google/client/callback
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5500
```

### Passo 5: Reiniciar Servidor

Após adicionar as variáveis de ambiente:

1. **No Render**: Faça um novo deploy ou reinicie o serviço
2. **Local**: Reinicie o servidor Node.js

---

## 🔍 Verificar se Está Configurado

### Teste 1: Verificar Variáveis no Servidor

Adicione temporariamente um log no código para verificar:

```javascript
// Em modules/agenda/google/googleOAuth.service.js
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ Não configurado');
```

### Teste 2: Tentar Conectar

1. Acesse o dashboard
2. Vá em "Agenda Inteligente"
3. Clique em "Conectar Google Calendar"
4. Deve redirecionar para Google (não deve aparecer erro de client_id)

---

## ⚠️ Problemas Comuns

### 1. "Missing required parameter: client_id"
**Causa**: Variável `GOOGLE_CLIENT_ID` não configurada ou vazia
**Solução**: Verificar se a variável está no `.env` ou no Render

### 2. "redirect_uri_mismatch"
**Causa**: URL de callback não está nas credenciais OAuth
**Solução**: Adicionar exatamente a mesma URL no Google Cloud Console

### 3. "invalid_client"
**Causa**: Client ID ou Secret incorretos
**Solução**: Verificar se copiou corretamente do Google Cloud Console

### 4. Variáveis não carregam no Render
**Causa**: Deploy feito antes de adicionar variáveis
**Solução**: Adicionar variáveis e fazer novo deploy

---

## 📋 Checklist de Configuração

- [ ] Projeto criado no Google Cloud Console
- [ ] Google Calendar API habilitada
- [ ] Credenciais OAuth 2.0 criadas
- [ ] URLs de callback adicionadas nas credenciais
- [ ] `GOOGLE_CLIENT_ID` configurado no `.env` ou Render
- [ ] `GOOGLE_CLIENT_SECRET` configurado no `.env` ou Render
- [ ] `GOOGLE_REDIRECT_URI_OWNER` configurado (opcional, usa padrão)
- [ ] `GOOGLE_REDIRECT_URI_CLIENT` configurado (opcional, usa padrão)
- [ ] Servidor reiniciado após adicionar variáveis
- [ ] Testado conexão e funcionou

---

## 🎯 URLs Importantes

### URLs de Callback (adicionar no Google Cloud Console):
- `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback`
- `https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback`

### Para desenvolvimento local:
- `http://localhost:5000/api/oauth/agenda/google/owner/callback`
- `http://localhost:5000/api/oauth/agenda/google/client/callback`

---

## ✅ Após Configurar

1. Reinicie o servidor
2. Tente conectar novamente
3. Deve redirecionar para Google sem erro
4. Após autorizar, deve voltar para dashboard com sucesso

---

## 📝 Notas

- O Client ID geralmente termina com `.apps.googleusercontent.com`
- O Client Secret é uma string longa (mantenha secreto!)
- As URLs de callback devem ser **exatamente** iguais no Google Console e no código
- Para desenvolvimento local, use `http://localhost:5000`
- Para produção, use `https://conectaking-api.onrender.com`
