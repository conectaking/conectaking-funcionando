# 🚀 Guia de Configuração de APIs Gratuitas para IA King

Este guia explica como configurar APIs gratuitas para melhorar as respostas da IA King.

## 📋 APIs Disponíveis

O sistema suporta 3 APIs gratuitas (em ordem de prioridade):

1. **Google Gemini** (Recomendado) - Melhor qualidade
2. **Groq** - Mais rápida
3. **Hugging Face** - Último recurso

## 🔑 Como Obter as Chaves

### 1. Google Gemini API (Recomendado)

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

**Limite gratuito:** 60 requisições por minuto

### 2. Groq API

1. Acesse: https://console.groq.com/keys
2. Crie uma conta (gratuita)
3. Vá em "API Keys" > "Create API Key"
4. Copie a chave gerada

**Limite gratuito:** 30 requisições por minuto

### 3. Hugging Face API

1. Acesse: https://huggingface.co/settings/tokens
2. Crie uma conta (gratuita)
3. Vá em "New token" > "Read"
4. Copie o token gerado

**Limite gratuito:** 1000 requisições por mês

## ⚙️ Como Configurar

### Passo 1: Adicionar no arquivo `.env`

Abra o arquivo `.env` na raiz do projeto e adicione:

```env
# Google Gemini (Recomendado)
GEMINI_API_KEY=sua_chave_aqui

# OU Groq (Alternativa rápida)
GROQ_API_KEY=sua_chave_aqui

# OU Hugging Face (Último recurso)
HUGGINGFACE_API_KEY=sua_chave_aqui
```

**Nota:** Você pode configurar uma ou todas as APIs. O sistema tentará usar na ordem de prioridade.

### Passo 2: Reiniciar o servidor

Após adicionar as chaves, reinicie o servidor:

```bash
npm start
```

## 🎯 Como Funciona

1. **Quando a IA não encontra resposta local** ou a confiança é baixa (< 70%), o sistema automaticamente tenta usar uma API externa.

2. **Ordem de tentativa:**
   - Primeiro tenta Google Gemini
   - Se falhar, tenta Groq
   - Se falhar, tenta Hugging Face
   - Se todas falharem, usa a resposta local

3. **Validação:** O sistema valida se a resposta da API é relevante antes de usar.

## ✅ Benefícios

- ✅ Respostas mais inteligentes e contextualizadas
- ✅ Melhor compreensão de perguntas complexas
- ✅ Respostas mais naturais e humanas
- ✅ Fallback automático se API falhar
- ✅ Totalmente gratuito (dentro dos limites)

## 🔍 Verificar se está funcionando

No console do servidor, você verá mensagens como:

```
🤖 [IA] Tentando melhorar resposta com API externa...
✅ [IA] Resposta melhorada com GEMINI
```

## ⚠️ Importante

- As APIs são usadas apenas quando necessário (resposta local fraca ou não encontrada)
- O sistema sempre prioriza respostas locais quando a confiança é alta
- Se não configurar nenhuma API, o sistema funciona normalmente com respostas locais

## 🆘 Problemas Comuns

**Erro: "API key inválida"**
- Verifique se copiou a chave corretamente
- Certifique-se de que não há espaços extras

**Erro: "Rate limit exceeded"**
- Você atingiu o limite gratuito
- Aguarde alguns minutos ou configure outra API

**API não está sendo usada**
- Verifique se a chave está no arquivo `.env`
- Reinicie o servidor após adicionar a chave
- Verifique os logs do console
