# 🔗 URLs para Política de Privacidade e Termos de Serviço

## ✅ Páginas Criadas

Criei as páginas públicas necessárias para publicar o app Google OAuth:

### 1. Política de Privacidade
**URL:** `https://conectaking-api.onrender.com/privacidade`

**OU se você usar seu domínio principal:**
`https://conectaking.com.br/privacidade` (se configurado)

### 2. Termos de Serviço
**URL:** `https://conectaking-api.onrender.com/termos`

**OU se você usar seu domínio principal:**
`https://conectaking.com.br/termos` (se configurado)

---

## 📋 O Que Foi Criado

1. ✅ **Rota pública:** `routes/publicLegal.routes.js`
2. ✅ **Template Política de Privacidade:** `views/privacidade.ejs`
3. ✅ **Template Termos de Serviço:** `views/termos.ejs`
4. ✅ **Rotas registradas no servidor**

---

## 🎯 Como Usar no Google Cloud Console

### Passo 1: Acesse a Tela de Consentimento OAuth

1. Google Cloud Console → Projeto "Conecta King Agenda"
2. **"APIs e Serviços"** > **"Tela de consentimento OAuth"**
3. Clique em **"Acesso a dados"** no menu lateral

### Passo 2: Adicione as URLs

**Política de privacidade:**
```
https://conectaking-api.onrender.com/privacidade
```

**Termos de serviço:**
```
https://conectaking-api.onrender.com/termos
```

### Passo 3: Salvar e Publicar

1. Clique em **"Salvar"**
2. Role até o final da página
3. Clique em **"PUBLICAR APP"**
4. Confirme

---

## 🔍 Verificar se Está Funcionando

### Teste as URLs:

1. **Política de Privacidade:**
   - Acesse: `https://conectaking-api.onrender.com/privacidade`
   - Deve mostrar a página completa

2. **Termos de Serviço:**
   - Acesse: `https://conectaking-api.onrender.com/termos`
   - Deve mostrar a página completa

---

## ⚠️ Importante

### Se você usar um domínio diferente:

Se suas páginas estiverem em `https://conectaking.com.br` ao invés de `https://conectaking-api.onrender.com`, 
você precisa:

1. **Criar as mesmas rotas no frontend** (se for separado)
2. **OU configurar um proxy/redirecionamento**
3. **OU usar as URLs do backend** (recomendado)

**Recomendação:** Use as URLs do backend (`conectaking-api.onrender.com`) pois já estão funcionando!

---

## 📝 Conteúdo das Páginas

### Política de Privacidade inclui:
- ✅ Como coletamos dados do Google Calendar
- ✅ Como usamos as informações
- ✅ Compartilhamento de dados (não compartilhamos)
- ✅ Segurança dos dados
- ✅ Direitos do usuário
- ✅ Contato

### Termos de Serviço inclui:
- ✅ Aceitação dos termos
- ✅ Descrição do serviço
- ✅ Uso aceitável
- ✅ Integração com Google Calendar
- ✅ Responsabilidades
- ✅ Limitação de responsabilidade
- ✅ Contato

---

## ✅ Próximos Passos

1. ✅ Páginas criadas
2. ✅ Rotas configuradas
3. ⏳ **Fazer deploy no Render** (para as páginas ficarem acessíveis)
4. ⏳ **Adicionar URLs no Google Cloud Console**
5. ⏳ **Publicar o app**

---

## 🚀 Fazer Deploy

Após fazer deploy, as URLs estarão acessíveis e você poderá:
1. Adicionar as URLs no Google Cloud Console
2. Publicar o app
3. Remover o modo de teste! ✅

---

## 📍 URLs Finais para Copiar

Copie estas URLs exatas para o Google Cloud Console:

```
Política de Privacidade:
https://conectaking-api.onrender.com/privacidade

Termos de Serviço:
https://conectaking-api.onrender.com/termos
```

---

## ✅ Pronto!

As páginas estão criadas e prontas para uso. Após fazer deploy, adicione as URLs no Google Cloud Console e publique o app! 🎉
