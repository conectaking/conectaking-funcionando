# ConectaKing AI Core

## 🧠 Arquitetura da Nova IA

A ConectaKing AI Core é uma inteligência artificial especializada exclusivamente no ecossistema ConectaKing, focada em vendas, marketing estratégico, copywriting, diagnóstico e evolução contínua.

## 📁 Estrutura de Arquivos

```
ai-core/
├── systemPrompt.js          # Prompt mestre fixo e permanente
├── intentClassifier.js      # Classificador de intenção
├── aiRouter.js              # Roteador principal da IA
├── modoCEO.js               # Modo CEO/Cérebro para análise
├── modules/                 # Módulos funcionais
│   ├── atendimento.js       # Atendimento ao cliente
│   ├── marketing.js         # Marketing estratégico
│   ├── copywriting.js       # Copywriting
│   ├── diagnostico.js       # Diagnóstico do sistema
│   └── redirecionamento.js  # Redirecionamento quando fora do foco
├── memory/                  # Sistema de memória
│   ├── memoryStore.js       # Armazenamento persistente
│   └── schemas.js           # Schemas de dados
└── training/                # Sistema de treinamento
    ├── supervisedTraining.js # Treinamento supervisionado
    └── apiLearning.js       # Aprendizado via API
```

## 🎯 Fluxo de Processamento

1. **Carregamento do Prompt Mestre**: O prompt mestre é carregado antes de qualquer resposta
2. **Classificação de Intenção**: A mensagem é classificada em uma das categorias
3. **Consulta à Memória**: A memória é consultada para conhecimento relevante
4. **Roteamento**: A mensagem é roteada para o módulo correto
5. **Geração de Resposta**: O módulo gera a resposta apropriada
6. **Atualização da Memória**: A memória é atualizada se necessário

## 📊 Tipos de Intenção

- `atendimento` - Atendimento ao cliente
- `dúvida_produto` - Dúvidas sobre o produto
- `dúvida_painel` - Dúvidas sobre o painel
- `marketing` - Marketing estratégico
- `vendas` - Vendas e estratégias
- `copy` - Copywriting
- `estratégia` - Estratégias gerais
- `diagnóstico_sistema` - Diagnóstico do sistema
- `treinamento_admin` - Treinamento administrativo
- `modo_ceo` - Modo CEO/Cérebro
- `fora_do_foco` - Redirecionamento

## 🧩 Módulos

### Atendimento
Processa dúvidas sobre o produto, uso do cartão e funcionalidades do painel.

### Marketing
Gera estratégias de marketing digital quando solicitado explicitamente.

### Copywriting
Cria copies de alta conversão quando solicitado explicitamente.

### Diagnóstico
Identifica erros no sistema e sugere melhorias.

### Redirecionamento
Redireciona educadamente quando o usuário sai do foco.

## 💾 Sistema de Memória

A memória armazena:
- Conhecimento do produto
- Dúvidas frequentes
- Estratégias validadas
- Copies de alta conversão
- Padrões de venda
- Erros do sistema
- Soluções confirmadas
- Aprendizados administrativos

## 🎓 Sistema de Treinamento

### Treinamento Supervisionado
Permite que administradores:
- Corrijam respostas da IA
- Inseram novas regras
- Salvem padrões melhores
- Substituam comportamentos antigos

**Prioridade máxima** sobre qualquer outro aprendizado.

### Aprendizado via API
Consome APIs externas APENAS para treinamento:
- Converte respostas em padrões internos
- Salva localmente
- NUNCA depende da API para responder ao usuário

## 👑 Modo CEO / Cérebro

Analisa a própria maturidade da IA:
- Pontos fortes
- Pontos fracos
- Sugestões de próximos treinamentos
- Evolução do conhecimento

## 🔌 Rotas da API

### Públicas (requerem autenticação de usuário)
- `POST /api/ai-core/chat` - Chat principal
- `GET /api/ai-core/stats` - Estatísticas

### Administrativas
- `POST /api/ai-core/training/correct` - Corrigir resposta
- `POST /api/ai-core/training/rule` - Inserir nova regra
- `POST /api/ai-core/training/pattern` - Salvar padrão melhor
- `GET /api/ai-core/training/history` - Histórico de treinamentos
- `GET /api/ai-core/training/rules` - Regras ativas
- `POST /api/ai-core/learning/api` - Aprender de API
- `GET /api/ai-core/learning/history` - Histórico de aprendizado
- `GET /api/ai-core/ceo/analyze` - Modo CEO
- `GET /api/ai-core/memory/stats` - Estatísticas da memória
- `POST /api/ai-core/memory/knowledge` - Salvar conhecimento
- `POST /api/ai-core/memory/faq` - Salvar FAQ
- `POST /api/ai-core/memory/copy` - Salvar copy

## 🗄️ Banco de Dados

Execute a migration `041_CONECTAKING_AI_CORE.sql` para criar as tabelas necessárias:

- `ai_core_memory` - Memória persistente
- `ai_core_supervised_training` - Treinamento supervisionado
- `ai_core_training_rules` - Regras de treinamento
- `ai_core_api_learning_history` - Histórico de aprendizado via API
- `ai_core_analysis` - Análises da IA (Modo CEO)
- `ai_core_usage_stats` - Estatísticas de uso

## 🚀 Como Usar

### Chat Básico
```javascript
POST /api/ai-core/chat
{
  "message": "Como usar o cartão virtual?",
  "conversationHistory": []
}
```

### Treinamento Supervisionado
```javascript
POST /api/ai-core/training/correct
{
  "conversationId": 123,
  "originalResponse": "Resposta antiga",
  "correctedResponse": "Resposta corrigida",
  "reason": "Melhor explicação",
  "priority": "high"
}
```

### Modo CEO
```javascript
GET /api/ai-core/ceo/analyze
```

## ⚠️ Importante

- A IA funciona **100% offline** em produção
- APIs externas são usadas **APENAS para treinamento**
- Marketing e copy são gerados **APENAS quando solicitados**
- A IA sempre mantém foco em **ConectaKing, vendas, marketing e sistema**
- Quando fora do foco, a IA **redireciona educadamente**

## 📝 Notas

- O prompt mestre é **fixo e permanente**
- A memória é **sempre consultada** antes de responder
- O treinamento supervisionado tem **prioridade máxima**
- A IA **aprende continuamente** com cada interação válida

