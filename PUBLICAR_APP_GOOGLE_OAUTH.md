# 🚀 Publicar App Google OAuth - Remover Modo de Teste

## ❓ Por Que Entrou em Modo de Teste?

Quando você cria um app OAuth no Google Cloud Console, ele **sempre começa em modo de teste** por padrão. Isso é uma medida de segurança do Google para:

1. **Proteger usuários** de apps não verificados
2. **Prevenir abusos** de apps maliciosos
3. **Garantir qualidade** antes de permitir acesso público

---

## ⏱️ Quanto Tempo Dura o Modo de Teste?

**O modo de teste dura INDEFINIDAMENTE** até você publicar o app.

- ✅ **Não expira automaticamente**
- ✅ **Pode ficar em teste para sempre** (até 100 usuários)
- ✅ **Você controla quando publicar**

---

## 🎯 Como Remover o Modo de Teste (Publicar o App)

Para que **qualquer pessoa** possa usar sem ser adicionada como testador, você precisa **publicar o app**.

### ⚠️ IMPORTANTE: Requisitos para Publicar

Antes de publicar, você precisa:

1. ✅ **Completar a tela de consentimento OAuth**
   - Nome do app
   - Email de suporte
   - Logo (opcional mas recomendado)
   - Política de privacidade (OBRIGATÓRIO)
   - Termos de serviço (OBRIGATÓRIO)

2. ✅ **Verificar domínio** (se necessário)

3. ✅ **Submeter para revisão do Google** (pode levar alguns dias)

---

## 📋 Passo a Passo para Publicar

### 1. Completar Tela de Consentimento

1. Acesse: https://console.cloud.google.com
2. Projeto: **"Conecta King Agenda"**
3. Menu: **"APIs e Serviços"** > **"Tela de consentimento OAuth"**

4. **Preencha TODOS os campos obrigatórios:**
   - ✅ Nome do app: `Conecta King Agenda`
   - ✅ Email de suporte: `conectaking@gmail.com`
   - ✅ Logo (opcional, mas recomendado)
   - ✅ **Política de privacidade** (URL obrigatória)
   - ✅ **Termos de serviço** (URL obrigatória)
   - ✅ Domínio autorizado (se tiver)

### 2. Criar Política de Privacidade e Termos

Você precisa criar páginas públicas com:

**Política de Privacidade:**
- URL exemplo: `https://conectaking.com.br/privacidade`
- Deve explicar como você usa os dados do Google Calendar

**Termos de Serviço:**
- URL exemplo: `https://conectaking.com.br/termos`
- Deve explicar as regras de uso do serviço

### 3. Submeter para Publicação

1. Na tela de consentimento, role até o final
2. Clique em **"PUBLICAR APP"** ou **"PUBLISH APP"**
3. Confirme que você preencheu todos os requisitos
4. Clique em **"Confirmar"**

### 4. Aguardar Revisão (Opcional)

- Se o Google pedir revisão, pode levar **3-7 dias úteis**
- Para apps simples (só Google Calendar), geralmente é aprovado rapidamente
- Você receberá um email quando for aprovado

---

## ⚡ Solução Rápida: Modo de Teste (Recomendado para Agora)

**Para desenvolvimento e uso imediato**, é melhor manter em modo de teste:

### Vantagens do Modo de Teste:
- ✅ **Funciona imediatamente** (sem esperar aprovação)
- ✅ **Até 100 usuários** podem ser adicionados
- ✅ **Sem necessidade de política de privacidade** (ainda)
- ✅ **Controle total** sobre quem pode usar

### Como Adicionar Usuários:
1. **Tela de consentimento OAuth** > **"Usuários de teste"**
2. Clique em **"+ Adicionar usuários"**
3. Adicione os emails (um por linha)
4. Salve

**Limite:** 100 usuários de teste

---

## 🎯 Recomendação

### Para Agora (Desenvolvimento/Teste):
✅ **Mantenha em modo de teste**
- Adicione os emails que vão usar
- Funciona imediatamente
- Sem burocracia

### Para Futuro (Produção em Massa):
📋 **Publique o app quando:**
- Tiver mais de 100 usuários
- Quiser que qualquer pessoa use sem adicionar
- Estiver pronto para produção

---

## 📝 Checklist para Publicar (Futuro)

- [ ] Nome do app preenchido
- [ ] Email de suporte configurado
- [ ] Logo adicionada (opcional)
- [ ] Política de privacidade criada e URL adicionada
- [ ] Termos de serviço criados e URL adicionada
- [ ] Domínio verificado (se necessário)
- [ ] Cliquei em "PUBLICAR APP"
- [ ] Aguardei aprovação (se necessário)
- [ ] App publicado! ✅

---

## ⚠️ Importante

### Modo de Teste:
- ✅ **Não expira**
- ✅ **Pode usar para sempre**
- ✅ **Até 100 usuários**
- ✅ **Sem necessidade de aprovação**

### Modo Publicado:
- ✅ **Ilimitado de usuários**
- ✅ **Qualquer pessoa pode usar**
- ⚠️ **Requer política de privacidade**
- ⚠️ **Pode precisar de revisão do Google**

---

## 🎯 Resumo

**Por que está em modo teste?**
→ É o padrão do Google para segurança

**Quanto tempo dura?**
→ Para sempre, até você publicar

**Como tirar?**
→ Publicar o app (requer política de privacidade e termos)

**Recomendação:**
→ **Mantenha em modo teste por enquanto** e adicione os emails que precisam usar. Publique apenas quando tiver mais de 100 usuários ou quiser acesso público.

---

## ✅ Solução Imediata

**Para usar agora:**
1. Vá em **"Tela de consentimento OAuth"**
2. **"Usuários de teste"** > **"+ Adicionar usuários"**
3. Adicione: `playadrian@gmail.com` e outros emails
4. Salve
5. Pronto! Funciona imediatamente! ✅

**Não precisa publicar agora!** O modo de teste funciona perfeitamente para até 100 usuários.
