# 🔧 Corrigir Erro: redirect_uri_mismatch

## 🔴 Erro Atual

Você está vendo o erro:
```
Erro 400: redirect_uri_mismatch
Acesso bloqueado: a solicitação desse app é inválida
```

## ✅ Solução: Configurar URLs Corretas no Google Cloud Console

O erro acontece porque a URL de callback no código **não está exatamente igual** à configurada no Google Cloud Console.

---

## 📋 URLs que o Código Está Usando

O código está usando estas URLs de callback:

1. **Owner (Dono):**
   ```
   https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
   ```

2. **Client (Cliente):**
   ```
   https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
   ```

---

## 🔧 Passo a Passo para Corrigir

### 1. Acesse o Google Cloud Console

1. Vá para: https://console.cloud.google.com
2. Selecione o projeto **"Conecta King Agenda"**
3. No menu lateral: **"APIs e Serviços"** > **"Credenciais"**

### 2. Edite as Credenciais OAuth

1. Encontre o **Client ID** que você criou
2. Clique no **ícone de lápis** (editar) ao lado do Client ID
3. Role até a seção **"URIs de redirecionamento autorizados"**

### 3. Adicione as URLs Exatas

**IMPORTANTE:** Copie e cole **EXATAMENTE** estas URLs (uma por linha):

```
https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
```

### 4. Verifique os Detalhes

Certifique-se de que:
- ✅ **NÃO** há espaços antes ou depois das URLs
- ✅ **NÃO** há barra (/) no final
- ✅ Está usando **https** (não http)
- ✅ O domínio é **conectaking-api.onrender.com** (não conectaking.com.br)
- ✅ O caminho é **/api/oauth/agenda/google/owner/callback** (exatamente assim)

### 5. Salve as Alterações

1. Clique em **"Salvar"**
2. Aguarde alguns segundos para as alterações serem aplicadas

### 6. Teste Novamente

1. Volte ao dashboard
2. Tente conectar o Google Calendar novamente
3. Deve funcionar! ✅

---

## ⚠️ Problemas Comuns

### ❌ URL Errada:
```
https://conectaking.com.br/api/oauth/agenda/google/owner/callback
```
**Problema:** Usando o domínio do frontend, não do backend

### ❌ URL com Barra no Final:
```
https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback/
```
**Problema:** Barra extra no final

### ❌ URL com Espaços:
```
 https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback 
```
**Problema:** Espaços antes ou depois

### ✅ URL Correta:
```
https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
```
**Correto:** Exatamente assim, sem espaços, sem barra no final

---

## 🔍 Como Verificar Qual URL Está Sendo Usada

### No Backend (Logs):

Após fazer deploy, os logs do servidor mostrarão:
```
🔗 Google OAuth URLs configuradas:
   Owner callback: https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
   Client callback: https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
```

### No Google Cloud Console:

1. Vá em **"APIs e Serviços"** > **"Credenciais"**
2. Clique no seu Client ID
3. Veja a lista de **"URIs de redirecionamento autorizados"**
4. Compare com as URLs acima

---

## 📝 Checklist de Verificação

- [ ] Acessei o Google Cloud Console
- [ ] Encontrei o projeto "Conecta King Agenda"
- [ ] Abri "APIs e Serviços" > "Credenciais"
- [ ] Cliquei para editar o Client ID
- [ ] Adicionei a URL: `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback`
- [ ] Adicionei a URL: `https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback`
- [ ] Verifiquei que não há espaços ou barras extras
- [ ] Salvei as alterações
- [ ] Aguardei alguns segundos
- [ ] Testei a conexão novamente
- [ ] Funcionou! ✅

---

## 🎯 URLs para Copiar e Colar

Copie estas URLs **exatamente** como estão e cole no Google Cloud Console:

```
https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
```

---

## ⚡ Solução Rápida

1. **Google Cloud Console** → **Credenciais** → **Editar Client ID**
2. **URIs de redirecionamento autorizados:**
   - Remova todas as URLs antigas
   - Adicione estas duas URLs (uma por linha):
     ```
     https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
     https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
     ```
3. **Salvar**
4. **Testar novamente**

---

## ✅ Após Corrigir

O erro `redirect_uri_mismatch` deve desaparecer e a conexão com Google Calendar deve funcionar perfeitamente! 🎉

---

## 🆘 Se Ainda Não Funcionar

1. Verifique os logs do servidor para ver qual URL está sendo usada
2. Compare **caractere por caractere** com a URL no Google Cloud Console
3. Certifique-se de que não há diferenças de maiúsculas/minúsculas
4. Aguarde alguns minutos após salvar (pode levar tempo para propagar)
