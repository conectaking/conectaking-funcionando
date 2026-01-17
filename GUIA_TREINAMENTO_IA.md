# 🧠 Guia de Treinamento Automático da IA King

## 📋 O que é?

O sistema de treinamento automático da IA King analisa todo o sistema Conecta King (páginas, planos, funcionalidades) e treina a IA para responder corretamente a todas as perguntas dos usuários.

## 🚀 Como Usar

### Opção 1: Via Script (Recomendado)

Execute o script de treinamento:

```bash
node scripts/train-ia-system.js
```

Este script irá:
1. ✅ Adicionar conhecimento sobre parcelamento e formas de pagamento
2. ✅ Analisar o `index.html` e extrair informações sobre planos
3. ✅ Usar o Gemini (se configurado) para criar respostas inteligentes
4. ✅ Adicionar tudo à base de conhecimento da IA

### Opção 2: Via API (Dashboard)

Acesse o dashboard como administrador e use a rota:

```
POST /api/ia-king/train-system
```

Ou verifique o status do treinamento:

```
GET /api/ia-king/train-system-status
```

## 🔧 O que o Sistema Faz

### 1. Análise Automática do Sistema

O sistema analisa:
- ✅ `public_html/index.html` - Página principal com informações sobre planos
- ✅ Informações de pagamento (PIX, Cartão, Parcelamento)
- ✅ Funcionalidades e módulos
- ✅ Como funciona o sistema

### 2. Uso do Gemini (Opcional)

Se você configurou a `GEMINI_API_KEY` no `.env`, o sistema usa o Gemini para:
- Analisar o conteúdo do sistema
- Criar respostas estruturadas e completas
- Melhorar a qualidade das respostas da IA

### 3. Base de Conhecimento

O sistema adiciona conhecimento em:
- **Tabela `ia_knowledge_base`**: Conhecimento geral
- **Categoria**: Assinatura, Planos, Sistema
- **Prioridade**: 95-100 (alta prioridade)
- **Fonte**: `system_auto_trained`

## 📚 Tópicos Treinados

O sistema treina a IA sobre:

1. **Formas de Pagamento e Parcelamento**
   - PIX (à vista)
   - Cartão de Crédito (até 12x)
   - Pagamento Mensal Recorrente
   - Taxas e valores

2. **Planos e Preços**
   - King Start (R$ 700)
   - King Prime (R$ 1.000)
   - King Corporate (R$ 2.300)
   - Funcionalidades de cada plano

3. **Funcionalidades do Sistema**
   - Módulos disponíveis
   - Carrossel, Loja Virtual, King Forms
   - Link Personalizado

4. **Como Funciona o Conecta King**
   - Tecnologia NFC
   - Cartão Virtual
   - Compartilhamento

## 🎯 Perguntas que a IA Agora Responde

Após o treinamento, a IA responde corretamente a:

- ✅ "Quantas vezes posso parcelar?"
- ✅ "Tem juros no cartão?"
- ✅ "Qual o valor da parcela?"
- ✅ "Posso pagar no PIX?"
- ✅ "Quais são os planos?"
- ✅ "O que tem em cada plano?"
- ✅ "Como funciona o sistema?"
- ✅ E muito mais!

## ⚙️ Configuração

### 1. Configurar Gemini (Opcional mas Recomendado)

Adicione no `.env`:

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
```

Para obter a chave:
1. Acesse: https://makersuite.google.com/app/apikey
2. Crie uma nova chave
3. Cole no `.env`

### 2. Executar o Treinamento

```bash
node scripts/train-ia-system.js
```

## 🔍 Verificar Status

Para verificar se o treinamento foi bem-sucedido:

```bash
# Via script (em breve)
# Ou via API:
GET /api/ia-king/train-system-status
```

## 🐛 Solução de Problemas

### Erro: "index.html não encontrado"
- Verifique se o arquivo existe em `public_html/index.html`

### Erro: "GEMINI_API_KEY não configurada"
- Não é um erro crítico, o sistema funciona sem Gemini
- Mas as respostas serão melhores com Gemini configurado

### IA não responde corretamente
1. Execute o treinamento novamente
2. Verifique se o conhecimento foi adicionado ao banco
3. Teste perguntas específicas

## 📝 Notas Importantes

- ⚠️ O treinamento pode levar alguns minutos
- ✅ Execute sempre que atualizar informações no sistema
- ✅ Execute após adicionar novos planos ou funcionalidades
- ✅ O sistema evita duplicar conhecimento existente

## 🎉 Resultado Esperado

Após o treinamento, a IA King será capaz de:
- ✅ Responder perguntas sobre parcelamento corretamente
- ✅ Explicar todos os planos e preços
- ✅ Detalhar funcionalidades do sistema
- ✅ Usar informações atualizadas do sistema
- ✅ Fornecer respostas completas e precisas

---

**Desenvolvido para o Conecta King** 👑
