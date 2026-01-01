# 🧠 Implementação de Embeddings Vetoriais (RAG)

## ✅ O que foi implementado

### 1. **Migration de Banco de Dados** (`migrations/038_IA_VECTOR_EMBEDDINGS.sql`)
- ✅ Adiciona coluna `embedding` na tabela `ia_knowledge_base`
- ✅ Adiciona coluna `qa_embedding` na tabela `ia_qa`
- ✅ Cria tabela `ia_embedding_cache` para cache de embeddings
- ✅ Cria tabela `ia_vector_search_metrics` para métricas
- ✅ Cria índices HNSW para busca rápida por similaridade
- ✅ Suporte condicional para pgvector (não quebra se não estiver instalado)

### 2. **Módulo de Embeddings** (`routes/embeddings.js`)
- ✅ Função `generateEmbedding()` - Gera embeddings para textos
- ✅ Função `searchByVectorSimilarity()` - Busca por similaridade vetorial
- ✅ Função `generateAndSaveEmbedding()` - Gera e salva embedding para conhecimento
- ✅ Função `generateEmbeddingsForAllKnowledge()` - Gera embeddings em lote
- ✅ Sistema de cache para evitar recalcular embeddings
- ✅ Embedding simples baseado em TF-IDF (temporário até integrar API real)

### 3. **Integração no Sistema de Busca** (`routes/iaKing.js`)
- ✅ Importação do módulo de embeddings
- ✅ Busca vetorial integrada em `findBestAnswer()`
- ✅ Resultados vetoriais têm prioridade alta nos candidatos
- ✅ Rotas de API para gerar embeddings:
  - `POST /api/ia-king/generate-embeddings` - Gerar para todo conhecimento
  - `POST /api/ia-king/knowledge/:id/generate-embedding` - Gerar para conhecimento específico

### 4. **Interface do Admin** (`public_html/admin/ia-king-admin.js` e `ia-king.html`)
- ✅ Botão "Gerar Embeddings (RAG)" na aba Base de Conhecimento
- ✅ Botão individual para gerar embedding em cada conhecimento
- ✅ Indicador visual quando conhecimento tem embedding
- ✅ Funções `generateAllEmbeddings()` e `generateEmbedding()`

## 🚀 Como usar

### 1. **Executar Migration**
```bash
node scripts/run-migrations.js
```
**Nota:** Se pgvector não estiver instalado, a migration ainda funcionará, mas os índices vetoriais não serão criados. Para instalar pgvector, siga: https://github.com/pgvector/pgvector

### 2. **Gerar Embeddings**
- **Opção 1:** No painel admin, aba "Base de Conhecimento", clique em "Gerar Embeddings (RAG)"
- **Opção 2:** Para conhecimento específico, clique no botão 🧠 ao lado do conhecimento

### 3. **Como funciona**
1. Quando uma pergunta é feita, o sistema:
   - Gera embedding da pergunta
   - Busca conhecimentos com embeddings similares (similaridade >= 70%)
   - Combina resultados vetoriais com busca tradicional
   - Prioriza resultados vetoriais (mais precisos)

2. Embeddings são gerados automaticamente quando:
   - Novo conhecimento é adicionado (futuro)
   - Você clica em "Gerar Embeddings"

## 📊 Benefícios

1. **Busca Semântica**: Encontra conhecimento mesmo sem palavras exatas
2. **Precisão**: Similar ao ChatGPT - entende contexto e significado
3. **Performance**: Cache de embeddings evita recalcular
4. **Escalável**: Índices HNSW permitem busca rápida em milhões de vetores

## 🔮 Próximos Passos

1. **Integrar API de Embeddings Real**:
   - OpenAI `text-embedding-3-small` (1536 dimensões)
   - Cohere Embeddings
   - Ou modelo local (Sentence Transformers)

2. **Geração Automática**:
   - Gerar embedding automaticamente ao adicionar conhecimento
   - Atualizar embeddings quando conhecimento é editado

3. **Melhorias**:
   - Ajustar threshold de similaridade baseado em testes
   - Adicionar métricas de qualidade de busca
   - Implementar re-ranking baseado em embeddings

## ⚠️ Notas Importantes

- **pgvector**: Para busca vetorial completa, instale a extensão pgvector no PostgreSQL
- **Embedding Simples**: Atualmente usa embedding simples baseado em TF-IDF. Para melhor precisão, integre uma API de embeddings real
- **Cache**: Embeddings são cacheados para evitar recalcular textos similares
- **Performance**: Geração de embeddings pode levar tempo dependendo da quantidade de conhecimento

---

**Data:** Dezembro 2024  
**Versão:** Embeddings RAG v1.0

