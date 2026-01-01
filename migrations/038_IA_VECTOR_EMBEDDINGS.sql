-- ============================================
-- MIGRATION 038: SISTEMA DE EMBEDDINGS VETORIAIS (RAG)
-- ============================================
-- Implementa sistema de embeddings vetoriais para busca semântica
-- Data: Dezembro 2024

-- Verificar se a extensão pgvector existe, se não, criar
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar coluna de embedding na tabela de conhecimento
ALTER TABLE ia_knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(1536); -- OpenAI usa 1536 dimensões

-- Adicionar coluna de embedding na tabela de Q&A
ALTER TABLE ia_knowledge_base 
ADD COLUMN IF NOT EXISTS qa_embedding vector(1536);

-- Criar índice para busca por similaridade (HNSW - mais rápido para buscas)
-- Se pgvector não estiver instalado, criar índice simples
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX IF NOT EXISTS idx_ia_knowledge_base_embedding 
        ON ia_knowledge_base 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
        
        RAISE NOTICE 'Índice HNSW criado com sucesso';
    ELSE
        RAISE NOTICE 'pgvector não instalado. Índice vetorial não criado.';
    END IF;
END $$;

-- Criar índice para Q&A embeddings (se pgvector estiver disponível)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX IF NOT EXISTS idx_ia_qa_embedding 
        ON ia_qa 
        USING hnsw (qa_embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        WHERE qa_embedding IS NOT NULL;
        
        RAISE NOTICE 'Índice HNSW para Q&A criado com sucesso';
    ELSE
        RAISE NOTICE 'pgvector não instalado. Índice vetorial para Q&A não criado.';
    END IF;
END $$;

-- Tabela para cache de embeddings (evitar recalcular)
CREATE TABLE IF NOT EXISTS ia_embedding_cache (
    id SERIAL PRIMARY KEY,
    text_hash VARCHAR(64) NOT NULL UNIQUE, -- Hash do texto para evitar duplicatas
    text_content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    model_name VARCHAR(100) DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_embedding_cache_hash ON ia_embedding_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_ia_embedding_cache_used ON ia_embedding_cache(last_used_at DESC);

-- Tabela para métricas de busca vetorial
CREATE TABLE IF NOT EXISTS ia_vector_search_metrics (
    id SERIAL PRIMARY KEY,
    search_query TEXT NOT NULL,
    query_embedding vector(1536),
    results_count INTEGER DEFAULT 0,
    avg_similarity DECIMAL(5,4), -- Similaridade média dos resultados
    search_time_ms INTEGER,
    used_cache BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_vector_search_metrics_created ON ia_vector_search_metrics(created_at DESC);

-- Função para atualizar last_used_at no cache
CREATE OR REPLACE FUNCTION update_embedding_cache_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ia_embedding_cache
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_embedding_cache_used
    AFTER SELECT ON ia_embedding_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_embedding_cache_used();

-- Comentários
COMMENT ON COLUMN ia_knowledge_base.embedding IS 'Embedding vetorial do conteúdo para busca semântica';
COMMENT ON TABLE ia_embedding_cache IS 'Cache de embeddings para evitar recalcular textos similares';
COMMENT ON TABLE ia_vector_search_metrics IS 'Métricas de performance das buscas vetoriais';

