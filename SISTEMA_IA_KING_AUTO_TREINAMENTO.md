# 🧠 Sistema de Auto-Treinamento Autônomo "IA King"

## 📋 Visão Geral

O sistema **IA King** é um mecanismo de auto-treinamento autônomo que permite que a IA aprenda automaticamente quando não souber responder uma pergunta. Ele pesquisa na internet, em livros/documentos e salva o conhecimento aprendido automaticamente no banco de dados.

## 🎯 Objetivos

1. **Autonomia Total**: A IA aprende sozinha sem necessidade de intervenção manual
2. **Pesquisa Inteligente**: Busca primeiro em livros/documentos, depois na internet
3. **Aprendizado Contínuo**: Salva automaticamente todo conhecimento aprendido
4. **Inteligência Contextual**: Detecta categorias de perguntas (religioso, histórico, etc) e busca livros específicos

## 🔄 Como Funciona

### Fluxo de Execução

1. **Usuário faz uma pergunta** que a IA não sabe responder (score < 40 ou sem resposta)

2. **Sistema IA King é ativado automaticamente**:
   - Detecta que não há resposta adequada
   - Inicia processo de auto-treinamento

3. **Fase 1: Busca em Livros/Documentos**
   - Busca em todos os documentos processados (`ia_documents`)
   - Busca em conhecimento de livros (`ia_knowledge_base` com `source_type` de livros)
   - **Detecção Inteligente de Categoria**:
     - Perguntas religiosas → busca em livros religiosos (Bíblia, evangelhos, etc)
     - Perguntas históricas → busca em livros históricos
     - Outras → busca geral em todos os livros
   - Extrai trechos relevantes que respondem à pergunta

4. **Fase 2: Pesquisa na Internet** (se não encontrou em livros)
   - Usa Tavily API para pesquisar na internet
   - Combina múltiplos resultados
   - Valida relevância dos resultados

5. **Fase 3: Salvamento Automático**
   - Salva conhecimento aprendido em `ia_knowledge_base`
   - Cria entrada em `ia_qa` para facilitar busca futura
   - Registra no histórico de auto-aprendizado (`ia_auto_learning_history`)
   - Atualiza conhecimento existente se o novo for melhor

6. **Resposta ao Usuário**
   - Usa conhecimento aprendido para responder
   - Aplica prompt mestre e personalidade
   - Retorna resposta completa e fundamentada

## 📊 Estrutura do Banco de Dados

### Tabelas Utilizadas

1. **`ia_knowledge_base`**
   - Armazena conhecimento aprendido
   - `source_type`: `ia_king_book_document`, `ia_king_book_book`, `ia_king_web_tavily`
   - `priority`: 85 (alta prioridade para conhecimento auto-aprendido)

2. **`ia_qa`**
   - Perguntas e respostas aprendidas
   - Facilita busca rápida em futuras perguntas similares

3. **`ia_auto_learning_history`**
   - Histórico de tudo que foi aprendido automaticamente
   - `source`: origem do conhecimento (livro, web, etc)
   - `confidence_score`: confiança no conhecimento aprendido

4. **`ia_documents`**
   - Documentos processados e indexados
   - Buscados quando a IA não sabe responder

5. **`ia_web_search_config`**
   - Configuração da busca na web (Tavily API)
   - Necessária para pesquisar na internet

## 🎨 Características Especiais

### 1. Detecção Inteligente de Categoria

O sistema detecta automaticamente o tipo de pergunta e busca em livros específicos:

- **Religioso**: "Quem é Jesus?", "O que é a Bíblia?"
  - Busca em livros com palavras-chave: bíblia, jesus, cristo, evangelho, religião
  
- **Histórico**: "Quem foi Napoleão?", "O que foi a Revolução Francesa?"
  - Busca em livros históricos

- **Geral**: Outras perguntas
  - Busca em todos os livros disponíveis

### 2. Extração Inteligente de Conteúdo

- Busca parágrafos que mencionam entidades da pergunta
- Extrai trechos relevantes (até 1000 caracteres)
- Prioriza conteúdo que responde diretamente à pergunta

### 3. Validação e Atualização

- Verifica se conhecimento similar já existe
- Atualiza conhecimento existente se o novo for melhor/mais completo
- Evita duplicatas desnecessárias

## 🔧 Configuração

### Pré-requisitos

1. **Tavily API** configurada em `ia_web_search_config`:
   ```sql
   INSERT INTO ia_web_search_config (is_enabled, api_provider, api_key)
   VALUES (true, 'tavily', 'sua_api_key_aqui');
   ```

2. **Livros/Documentos** processados e indexados:
   - Documentos em `ia_documents` com `processed = true`
   - Conhecimento de livros em `ia_knowledge_base` com `source_type` de livros

### Ativação

O sistema é **ativado automaticamente** quando:
- A IA não encontra resposta adequada (`bestScore < 40`)
- Não há resposta (`!bestAnswer`)

**Não requer configuração manual** - funciona automaticamente!

## 📈 Estatísticas e Monitoramento

### Logs do Sistema

O sistema gera logs detalhados:

- `🧠 [IA KING] Sistema de auto-treinamento ativado para: [pergunta]`
- `📖 [IA KING] Buscando em livros e documentos...`
- `🌐 [IA KING] Pesquisando na internet...`
- `✅ [IA KING] Encontrou conhecimento em livro/documento: [título]`
- `✅ [IA KING] Resposta encontrada na internet (Tavily direto)`
- `💾 [IA KING] Conhecimento salvo automaticamente na base de dados!`

### Histórico de Aprendizado

Consulte o histórico de aprendizado:

```sql
SELECT * FROM ia_auto_learning_history
ORDER BY created_at DESC
LIMIT 50;
```

## 🚀 Exemplos de Uso

### Exemplo 1: Pergunta sobre pessoa desconhecida

**Pergunta**: "Quem é Pablo Massal?"

1. Sistema não encontra resposta na base de conhecimento
2. IA King é ativado automaticamente
3. Busca em livros/documentos → não encontra
4. Pesquisa na internet → encontra informações
5. Salva conhecimento aprendido
6. Responde ao usuário com informações encontradas

### Exemplo 2: Pergunta religiosa

**Pergunta**: "Quem é Jesus?"

1. Sistema não encontra resposta completa
2. IA King detecta pergunta religiosa
3. Busca especificamente em livros religiosos (Bíblia, evangelhos)
4. Encontra trechos relevantes
5. Salva conhecimento aprendido
6. Responde com base nos livros encontrados

### Exemplo 3: Pergunta histórica

**Pergunta**: "O que foi a Segunda Guerra Mundial?"

1. Sistema não tem conhecimento detalhado
2. IA King detecta pergunta histórica
3. Busca em livros históricos
4. Se não encontrar, pesquisa na internet
5. Salva conhecimento aprendido
6. Responde com informações completas

## ⚠️ Limitações e Considerações

1. **Dependência de Tavily API**: Requer API key válida para pesquisar na internet
2. **Qualidade dos Livros**: Depende da qualidade dos livros/documentos indexados
3. **Limite de Conteúdo**: Conhecimento salvo limitado a 15.000 caracteres
4. **Validação**: Sistema valida relevância, mas pode aprender informações incorretas se a fonte for ruim

## 🔮 Melhorias Futuras

1. **Validação de Fontes**: Verificar credibilidade das fontes antes de aprender
2. **Aprendizado Incremental**: Melhorar conhecimento existente gradualmente
3. **Categorização Automática**: Detectar mais categorias automaticamente
4. **Feedback do Usuário**: Usar feedback para melhorar qualidade do aprendizado
5. **Busca em Múltiplas APIs**: Usar outras APIs além do Tavily

## 📝 Notas Técnicas

- Função principal: `autoTrainIAKing(question, questionContext, client)`
- Localização: `routes/iaKing.js` (linha ~1315)
- Integração: Chamada automática em `findBestAnswer()` quando não há resposta adequada
- Assíncrono: Não bloqueia resposta ao usuário se houver erro

## ✅ Status

✅ **Implementado e Funcional**
- Sistema de auto-treinamento autônomo
- Busca em livros/documentos
- Pesquisa na internet
- Salvamento automático
- Detecção de categorias
- Integração completa

---

**Desenvolvido para tornar a IA King verdadeiramente autônoma e autossustentável! 🚀**

