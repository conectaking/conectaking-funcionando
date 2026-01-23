-- Migration: Criar tabelas para IA KING
-- Data: 2025-01-31
-- Descrição: Sistema completo de IA KING com base de conhecimento, documentos, aprendizado e histórico

-- ============================================
-- PARTE 1: Tabela de Categorias de Conhecimento
-- ============================================
CREATE TABLE IF NOT EXISTS ia_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    priority INTEGER DEFAULT 0, -- Prioridade de uso (maior = mais importante)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PARTE 2: Base de Conhecimento Geral
-- ============================================
CREATE TABLE IF NOT EXISTS ia_knowledge_base (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT[], -- Array de palavras-chave para busca
    source_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'document', 'system', 'user'
    source_reference TEXT, -- Referência ao documento ou sistema
    priority INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0, -- Quantas vezes foi usado
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER, -- ID do admin que criou
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_keywords ON ia_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_category ON ia_knowledge_base(category_id);
CREATE INDEX IF NOT EXISTS idx_ia_knowledge_active ON ia_knowledge_base(is_active);

-- ============================================
-- PARTE 3: Documentos e Livros
-- ============================================
CREATE TABLE IF NOT EXISTS ia_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50), -- 'pdf', 'doc', 'txt', 'docx'
    file_size BIGINT, -- Tamanho em bytes
    extracted_text TEXT, -- Texto extraído do documento
    processed BOOLEAN DEFAULT false, -- Se já foi processado e indexado
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    uploaded_by INTEGER, -- ID do admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca no texto extraído
CREATE INDEX IF NOT EXISTS idx_ia_documents_text ON ia_documents USING GIN(to_tsvector('portuguese', extracted_text));
CREATE INDEX IF NOT EXISTS idx_ia_documents_processed ON ia_documents(processed);

-- ============================================
-- PARTE 4: Perguntas e Respostas Aprovadas
-- ============================================
CREATE TABLE IF NOT EXISTS ia_qa (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_variations TEXT[], -- Variações da pergunta
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    keywords TEXT[],
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0, -- Taxa de sucesso (0-100)
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_qa_keywords ON ia_qa USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ia_qa_question ON ia_qa USING GIN(to_tsvector('portuguese', question));

-- ============================================
-- PARTE 5: Histórico de Conversas
-- ============================================
-- Criar tabela primeiro sem foreign key
CREATE TABLE IF NOT EXISTS ia_conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Tipo correto: VARCHAR para corresponder à tabela users
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    knowledge_used INTEGER[], -- IDs do conhecimento usado
    confidence_score DECIMAL(5,2), -- Confiança na resposta (0-100)
    user_feedback INTEGER, -- -1 (negativo), 0 (neutro), 1 (positivo)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar foreign key se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ia_conversations_user_id_fkey'
    ) THEN
        ALTER TABLE ia_conversations 
        ADD CONSTRAINT ia_conversations_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key ia_conversations_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ia_conversations_user ON ia_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_conversations_created ON ia_conversations(created_at DESC);

-- ============================================
-- PARTE 6: Aprendizado Pendente de Aprovação
-- ============================================
CREATE TABLE IF NOT EXISTS ia_learning (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    suggested_answer TEXT NOT NULL,
    context TEXT, -- Contexto da pergunta original
    source_conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by INTEGER, -- ID do admin que revisou
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_learning_status ON ia_learning(status);
CREATE INDEX IF NOT EXISTS idx_ia_learning_pending ON ia_learning(status) WHERE status = 'pending';

-- ============================================
-- PARTE 7: Estatísticas e Métricas
-- ============================================
CREATE TABLE IF NOT EXISTS ia_statistics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value JSONB, -- Valor flexível em JSON
    date_recorded DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_name, date_recorded)
);

-- ============================================
-- PARTE 8: Inserir Categorias Padrão
-- ============================================
INSERT INTO ia_categories (name, description, priority) VALUES
('Sistema', 'Perguntas sobre o funcionamento do sistema Conecta King', 100),
('Módulos', 'Informações sobre módulos disponíveis', 90),
('Assinatura', 'Dúvidas sobre planos e assinaturas', 80),
('Suporte', 'Questões de suporte técnico', 70),
('Geral', 'Perguntas gerais', 50)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PARTE 9: Inserir Conhecimento Inicial do Sistema
-- ============================================
INSERT INTO ia_knowledge_base (category_id, title, content, keywords, source_type) VALUES
(
    (SELECT id FROM ia_categories WHERE name = 'Sistema' LIMIT 1),
    'O que é o Conecta King?',
    'O Conecta King é uma plataforma completa para criação de cartões virtuais profissionais. Você pode adicionar links, redes sociais, módulos personalizados e muito mais!',
    ARRAY['conecta king', 'plataforma', 'cartão virtual', 'o que é'],
    'system'
),
(
    (SELECT id FROM ia_categories WHERE name = 'Módulos' LIMIT 1),
    'Quais módulos posso adicionar?',
    'Você pode adicionar diversos módulos como: WhatsApp, Instagram, TikTok, YouTube, Link Personalizado, Banner, Carrossel, Página de Vendas e muito mais!',
    ARRAY['módulos', 'adicionar', 'disponíveis', 'tipos'],
    'system'
),
(
    (SELECT id FROM ia_categories WHERE name = 'Assinatura' LIMIT 1),
    'Quais são os planos disponíveis?',
    'Temos três planos principais: Pacote 1 (Individual), Pacote 2 (Individual com Logo) e Pacote 3 (Empresarial). Cada um com funcionalidades específicas!',
    ARRAY['planos', 'assinatura', 'pacotes', 'preços'],
    'system'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 
    '✅ Migration executada com sucesso!' as status,
    (SELECT COUNT(*) FROM ia_categories) as total_categorias,
    (SELECT COUNT(*) FROM ia_knowledge_base) as total_conhecimento,
    (SELECT COUNT(*) FROM ia_qa) as total_qa;

