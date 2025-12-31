-- Migration: Corrigir colunas da IA KING
-- Data: 2025-01-31
-- Descrição: Garantir que todas as colunas necessárias existem e estão corretas

-- ============================================
-- PARTE 1: Verificar e corrigir ia_knowledge_base
-- ============================================

-- Garantir que category_id existe (já deve existir, mas vamos garantir)
DO $$ 
BEGIN
    -- Verificar se a coluna category_id existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna category_id adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna category_id já existe em ia_knowledge_base';
    END IF;

    -- Remover coluna 'category' se existir (não deve existir, mas vamos garantir)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE ia_knowledge_base DROP COLUMN category;
        RAISE NOTICE 'Coluna category removida de ia_knowledge_base (substituída por category_id)';
    ELSE
        RAISE NOTICE 'Coluna category não existe em ia_knowledge_base (correto)';
    END IF;

    -- Garantir que priority existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN priority INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna priority adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna priority já existe em ia_knowledge_base';
    END IF;

    -- Garantir que usage_count existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'usage_count'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN usage_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna usage_count adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna usage_count já existe em ia_knowledge_base';
    END IF;

    -- Garantir que is_active existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Coluna is_active adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna is_active já existe em ia_knowledge_base';
    END IF;

    -- Garantir que source_type existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'source_type'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN source_type VARCHAR(50) DEFAULT 'manual';
        RAISE NOTICE 'Coluna source_type adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna source_type já existe em ia_knowledge_base';
    END IF;

    -- Garantir que source_reference existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'source_reference'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN source_reference TEXT;
        RAISE NOTICE 'Coluna source_reference adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna source_reference já existe em ia_knowledge_base';
    END IF;

    -- Garantir que keywords existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'keywords'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN keywords TEXT[];
        RAISE NOTICE 'Coluna keywords adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna keywords já existe em ia_knowledge_base';
    END IF;

    -- Garantir que created_by existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN created_by INTEGER;
        RAISE NOTICE 'Coluna created_by adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna created_by já existe em ia_knowledge_base';
    END IF;

    -- Garantir que updated_at existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_knowledge_base' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE ia_knowledge_base 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Coluna updated_at adicionada à ia_knowledge_base';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe em ia_knowledge_base';
    END IF;
END $$;

-- ============================================
-- PARTE 2: Criar índices se não existirem
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ia_knowledge_keywords ON ia_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_category ON ia_knowledge_base(category_id);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_active ON ia_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_source_type ON ia_knowledge_base(source_type);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_priority ON ia_knowledge_base(priority DESC);

-- ============================================
-- PARTE 3: Verificar estrutura final
-- ============================================

-- Mostrar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ia_knowledge_base'
ORDER BY ordinal_position;

-- ============================================
-- PARTE 4: Comentários para documentação
-- ============================================

COMMENT ON TABLE ia_knowledge_base IS 'Base de conhecimento da IA KING - armazena todo conhecimento aprendido';
COMMENT ON COLUMN ia_knowledge_base.category_id IS 'ID da categoria do conhecimento (referência a ia_categories)';
COMMENT ON COLUMN ia_knowledge_base.source_type IS 'Tipo de fonte: manual, book_training, tavily_book, tavily_book_trained, document, system, etc';
COMMENT ON COLUMN ia_knowledge_base.priority IS 'Prioridade do conhecimento (maior = mais importante, usado primeiro)';
COMMENT ON COLUMN ia_knowledge_base.usage_count IS 'Quantas vezes este conhecimento foi usado em respostas';
COMMENT ON COLUMN ia_knowledge_base.is_active IS 'Se o conhecimento está ativo e pode ser usado';

