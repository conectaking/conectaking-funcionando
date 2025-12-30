-- Migration: Corrigir estrutura de ia_conversations e verificar web_search_config
-- Data: 2025-12-30
-- Descrição: Corrigir colunas da tabela ia_conversations e garantir que web_search_config está correta

-- ============================================
-- PARTE 1: Verificar e corrigir ia_conversations
-- ============================================

-- Verificar se as colunas existem
DO $$
BEGIN
    -- Verificar se existe coluna 'user_message' (antiga)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_conversations' 
        AND column_name = 'user_message'
    ) THEN
        -- Se existe user_message, renomear para message
        ALTER TABLE ia_conversations RENAME COLUMN user_message TO message;
        RAISE NOTICE 'Coluna user_message renomeada para message';
    END IF;
    
    -- Verificar se existe coluna 'ai_response' (antiga)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_conversations' 
        AND column_name = 'ai_response'
    ) THEN
        -- Se existe ai_response, renomear para response
        ALTER TABLE ia_conversations RENAME COLUMN ai_response TO response;
        RAISE NOTICE 'Coluna ai_response renomeada para response';
    END IF;
    
    -- Verificar se existe coluna 'source_type' (pode não existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ia_conversations' 
        AND column_name = 'source_type'
    ) THEN
        -- Não criar source_type se não existir, pois não é necessário
        RAISE NOTICE 'Coluna source_type não existe (não é necessária)';
    END IF;
END $$;

-- ============================================
-- PARTE 2: Verificar estrutura atual de ia_conversations
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ia_conversations'
ORDER BY ordinal_position;

-- ============================================
-- PARTE 3: Verificar e garantir que ia_web_search_config existe
-- ============================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS ia_web_search_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    api_provider VARCHAR(50) DEFAULT 'scraping',
    api_key TEXT,
    max_results INTEGER DEFAULT 5,
    search_domains TEXT[],
    blocked_domains TEXT[],
    use_cache BOOLEAN DEFAULT true,
    cache_duration_hours INTEGER DEFAULT 24,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verificar se existe configuração
SELECT 
    id,
    is_enabled,
    api_provider,
    CASE 
        WHEN api_key IS NULL THEN 'NULL'
        WHEN api_key = '' THEN 'VAZIO'
        ELSE 'OK (' || LEFT(api_key, 20) || '...)'
    END as api_key_status,
    max_results,
    updated_at
FROM ia_web_search_config
ORDER BY id DESC
LIMIT 1;

-- ============================================
-- PARTE 4: Se não houver configuração, criar uma padrão
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ia_web_search_config) THEN
        INSERT INTO ia_web_search_config (is_enabled, api_provider, max_results)
        VALUES (false, 'tavily', 5);
        RAISE NOTICE 'Configuração padrão criada (desabilitada)';
    ELSE
        RAISE NOTICE 'Configuração já existe';
    END IF;
END $$;

-- ============================================
-- PARTE 5: Mensagem final
-- ============================================
SELECT 
    '✅ Verificação concluída!' as status,
    (SELECT COUNT(*) FROM ia_web_search_config) as total_configs,
    (SELECT COUNT(*) FROM ia_conversations) as total_conversations;

