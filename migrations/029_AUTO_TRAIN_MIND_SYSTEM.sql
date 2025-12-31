-- ============================================
-- MIGRATION: Sistema de Treinamento Automático da Mentalidade da IA
-- Data: 2025-01-31
-- Descrição: Cria sistema para rastrear treinamentos automáticos da mentalidade/cognição da IA na internet
-- ============================================

-- ============================================
-- PARTE 1: Histórico de Treinamentos Automáticos
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_train_mind_history (
    id SERIAL PRIMARY KEY,
    started_by INTEGER, -- ID do admin que iniciou o treinamento
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    topics_searched INTEGER DEFAULT 0, -- Quantidade de tópicos pesquisados
    knowledge_added INTEGER DEFAULT 0, -- Quantidade de itens de conhecimento adicionados
    total_searches INTEGER DEFAULT 0, -- Total de buscas realizadas
    errors_count INTEGER DEFAULT 0, -- Quantidade de erros encontrados
    error_message TEXT, -- Mensagem de erro se houver
    training_topics TEXT[], -- Array com os tópicos que foram pesquisados
    tavily_api_used BOOLEAN DEFAULT false, -- Se usou Tavily API
    execution_time_seconds INTEGER -- Tempo de execução em segundos
);

CREATE INDEX IF NOT EXISTS idx_ia_auto_train_mind_history_started_at ON ia_auto_train_mind_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_auto_train_mind_history_status ON ia_auto_train_mind_history(status);
CREATE INDEX IF NOT EXISTS idx_ia_auto_train_mind_history_started_by ON ia_auto_train_mind_history(started_by);

-- ============================================
-- PARTE 2: Detalhes de Cada Treinamento (tópicos individuais)
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_train_mind_details (
    id SERIAL PRIMARY KEY,
    training_id INTEGER REFERENCES ia_auto_train_mind_history(id) ON DELETE CASCADE,
    topic TEXT NOT NULL, -- Tópico pesquisado
    search_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'searching', 'completed', 'failed'
    results_found INTEGER DEFAULT 0, -- Quantidade de resultados encontrados
    knowledge_added INTEGER DEFAULT 0, -- Quantidade de conhecimento adicionado deste tópico
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ia_auto_train_mind_details_training_id ON ia_auto_train_mind_details(training_id);
CREATE INDEX IF NOT EXISTS idx_ia_auto_train_mind_details_status ON ia_auto_train_mind_details(search_status);

-- ============================================
-- PARTE 3: Configuração de Treinamento Automático
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_train_mind_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true, -- Se o treinamento automático está habilitado
    max_topics_per_training INTEGER DEFAULT 15, -- Máximo de tópicos por treinamento
    max_results_per_topic INTEGER DEFAULT 5, -- Máximo de resultados por tópico
    min_content_length INTEGER DEFAULT 100, -- Tamanho mínimo do conteúdo para adicionar
    max_content_length INTEGER DEFAULT 10000, -- Tamanho máximo do conteúdo
    delay_between_searches_ms INTEGER DEFAULT 1000, -- Delay entre buscas (ms)
    default_topics TEXT[], -- Tópicos padrão para treinar
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração padrão (só se não existir)
INSERT INTO ia_auto_train_mind_config (
    is_enabled,
    max_topics_per_training,
    max_results_per_topic,
    min_content_length,
    max_content_length,
    delay_between_searches_ms,
    default_topics
)
SELECT 
    true,
    15,
    5,
    100,
    10000,
    1000,
    ARRAY[
        'inteligência artificial mentalidade e cognição',
        'como IAs pensam e raciocinam',
        'sistemas de resposta inteligente',
        'processamento de linguagem natural avançado',
        'arquitetura cognitiva de IAs',
        'raciocínio lógico em inteligência artificial',
        'sistemas de conhecimento e memória',
        'aprendizado de máquina para IAs conversacionais',
        'síntese de informação e geração de respostas',
        'anti-alucinação em IAs',
        'validação de conhecimento em sistemas de IA',
        'contexto e memória em conversas com IA',
        'extração de entidades e palavras-chave',
        'classificação de intenções em IAs',
        'sistemas de busca semântica'
    ]
WHERE NOT EXISTS (SELECT 1 FROM ia_auto_train_mind_config);

-- ============================================
-- PARTE 4: Estatísticas de Treinamento
-- ============================================
CREATE TABLE IF NOT EXISTS ia_auto_train_mind_stats (
    id SERIAL PRIMARY KEY,
    total_trainings INTEGER DEFAULT 0, -- Total de treinamentos executados
    total_knowledge_added INTEGER DEFAULT 0, -- Total de conhecimento adicionado
    total_topics_searched INTEGER DEFAULT 0, -- Total de tópicos pesquisados
    avg_knowledge_per_training DECIMAL(10,2) DEFAULT 0, -- Média de conhecimento por treinamento
    last_training_at TIMESTAMP, -- Data do último treinamento
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir estatísticas iniciais (só se não existir)
INSERT INTO ia_auto_train_mind_stats (total_trainings, total_knowledge_added, total_topics_searched)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM ia_auto_train_mind_stats);

-- ============================================
-- PARTE 5: Mensagem de Sucesso
-- ============================================
SELECT 
    '✅ Sistema de Treinamento Automático da Mentalidade criado com sucesso!' as status,
    (SELECT COUNT(*) FROM ia_auto_train_mind_config) as configs,
    (SELECT COUNT(*) FROM ia_auto_train_mind_stats) as stats,
    (SELECT COUNT(*) FROM ia_auto_train_mind_history) as history_records;


