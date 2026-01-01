-- ============================================
-- MIGRATION 038: SISTEMA DE EMBEDDINGS VETORIAIS (RAG)
-- ============================================
-- Implementa sistema de embeddings vetoriais para busca semântica
-- Data: Dezembro 2024

-- Verificar se a extensão pgvector existe, se não, tentar criar
-- NOTA: pgvector precisa ser instalado no PostgreSQL primeiro
-- Para instalar: https://github.com/pgvector/pgvector
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        BEGIN
            CREATE EXTENSION vector;
            RAISE NOTICE 'Extensão pgvector criada com sucesso';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Extensão pgvector não disponível. Instale pgvector primeiro.';
            RAISE NOTICE 'Erro: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Extensão pgvector já existe';
    END IF;
END $$;

-- Adicionar coluna de embedding na tabela de conhecimento (se pgvector estiver disponível)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN IF NOT EXISTS embedding vector(1536); -- OpenAI usa 1536 dimensões
        
        ALTER TABLE ia_qa 
        ADD COLUMN IF NOT EXISTS qa_embedding vector(1536);
        
        RAISE NOTICE 'Colunas de embedding adicionadas com sucesso';
    ELSE
        RAISE NOTICE 'pgvector não instalado. Colunas de embedding não serão criadas.';
    END IF;
END $$;

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
-- Usar TEXT para embedding se pgvector não estiver disponível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE TABLE IF NOT EXISTS ia_embedding_cache (
            id SERIAL PRIMARY KEY,
            text_hash VARCHAR(64) NOT NULL UNIQUE,
            text_content TEXT NOT NULL,
            embedding vector(1536) NOT NULL,
            model_name VARCHAR(100) DEFAULT 'text-embedding-3-small',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        CREATE TABLE IF NOT EXISTS ia_embedding_cache (
            id SERIAL PRIMARY KEY,
            text_hash VARCHAR(64) NOT NULL UNIQUE,
            text_content TEXT NOT NULL,
            embedding TEXT NOT NULL, -- Usar TEXT se pgvector não estiver disponível
            model_name VARCHAR(100) DEFAULT 'text-embedding-3-small',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ia_embedding_cache_hash ON ia_embedding_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_ia_embedding_cache_used ON ia_embedding_cache(last_used_at DESC);

-- Tabela para métricas de busca vetorial
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE TABLE IF NOT EXISTS ia_vector_search_metrics (
            id SERIAL PRIMARY KEY,
            search_query TEXT NOT NULL,
            query_embedding vector(1536),
            results_count INTEGER DEFAULT 0,
            avg_similarity DECIMAL(5,4),
            search_time_ms INTEGER,
            used_cache BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        CREATE TABLE IF NOT EXISTS ia_vector_search_metrics (
            id SERIAL PRIMARY KEY,
            search_query TEXT NOT NULL,
            query_embedding TEXT, -- Usar TEXT se pgvector não estiver disponível
            results_count INTEGER DEFAULT 0,
            avg_similarity DECIMAL(5,4),
            search_time_ms INTEGER,
            used_cache BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ia_vector_search_metrics_created ON ia_vector_search_metrics(created_at DESC);

-- Função para atualizar last_used_at no cache quando usado
-- NOTA: PostgreSQL não suporta triggers em SELECT, então usaremos uma função manual
CREATE OR REPLACE FUNCTION update_embedding_cache_used(p_text_hash VARCHAR(64))
RETURNS VOID AS $$
BEGIN
    UPDATE ia_embedding_cache
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE text_hash = p_text_hash;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON COLUMN ia_knowledge_base.embedding IS 'Embedding vetorial do conteúdo para busca semântica';
COMMENT ON TABLE ia_embedding_cache IS 'Cache de embeddings para evitar recalcular textos similares';
COMMENT ON TABLE ia_vector_search_metrics IS 'Métricas de performance das buscas vetoriais';

