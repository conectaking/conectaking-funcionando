-- ============================================
-- MIGRATION 035: FASE 2 - GRAFO DE CONHECIMENTO
-- ============================================
-- Implementa Grafo de Conhecimento, Raciocínio Causal e Meta-Cognição
-- Data: Dezembro 2024

-- Tabela de Conceitos (Nodes do Grafo)
CREATE TABLE IF NOT EXISTS ia_knowledge_graph_concepts (
    id SERIAL PRIMARY KEY,
    concept_name VARCHAR(255) NOT NULL UNIQUE,
    concept_type VARCHAR(100), -- 'entity', 'event', 'property', 'relation', 'category'
    description TEXT,
    category_id INTEGER REFERENCES ia_categories(id) ON DELETE SET NULL,
    properties JSONB DEFAULT '{}'::jsonb, -- Propriedades adicionais do conceito
    importance_score DECIMAL(5,2) DEFAULT 1.0, -- Importância do conceito (0-10)
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_kg_concepts_name ON ia_knowledge_graph_concepts(concept_name);
CREATE INDEX IF NOT EXISTS idx_kg_concepts_type ON ia_knowledge_graph_concepts(concept_type);
CREATE INDEX IF NOT EXISTS idx_kg_concepts_category ON ia_knowledge_graph_concepts(category_id);

-- Tabela de Relações (Edges do Grafo)
CREATE TABLE IF NOT EXISTS ia_knowledge_graph_relations (
    id SERIAL PRIMARY KEY,
    from_concept_id INTEGER NOT NULL REFERENCES ia_knowledge_graph_concepts(id) ON DELETE CASCADE,
    to_concept_id INTEGER NOT NULL REFERENCES ia_knowledge_graph_concepts(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL, -- 'is_a', 'part_of', 'causes', 'related_to', 'similar_to', 'opposite_of', 'enables', 'requires', etc.
    strength DECIMAL(3,2) DEFAULT 1.0, -- Força da relação (0-1)
    confidence DECIMAL(3,2) DEFAULT 1.0, -- Confiança na relação (0-1)
    evidence_count INTEGER DEFAULT 1, -- Quantas vezes esta relação foi confirmada
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_concept_id, to_concept_id, relation_type)
);

-- Índices para busca de relações
CREATE INDEX IF NOT EXISTS idx_kg_relations_from ON ia_knowledge_graph_relations(from_concept_id);
CREATE INDEX IF NOT EXISTS idx_kg_relations_to ON ia_knowledge_graph_relations(to_concept_id);
CREATE INDEX IF NOT EXISTS idx_kg_relations_type ON ia_knowledge_graph_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_kg_relations_strength ON ia_knowledge_graph_relations(strength DESC);

-- Tabela de Cadeias Causais
CREATE TABLE IF NOT EXISTS ia_causal_chains (
    id SERIAL PRIMARY KEY,
    cause_concept_id INTEGER REFERENCES ia_knowledge_graph_concepts(id) ON DELETE SET NULL,
    effect_concept_id INTEGER REFERENCES ia_knowledge_graph_concepts(id) ON DELETE SET NULL,
    chain_description TEXT NOT NULL, -- Descrição da cadeia causal
    chain_steps JSONB NOT NULL, -- Array de passos na cadeia: [{concept_id, step_order, description}]
    confidence DECIMAL(3,2) DEFAULT 0.5, -- Confiança na cadeia causal
    evidence_count INTEGER DEFAULT 1,
    domain VARCHAR(100), -- Domínio da cadeia (vendas, tecnologia, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para cadeias causais
CREATE INDEX IF NOT EXISTS idx_causal_chains_cause ON ia_causal_chains(cause_concept_id);
CREATE INDEX IF NOT EXISTS idx_causal_chains_effect ON ia_causal_chains(effect_concept_id);
CREATE INDEX IF NOT EXISTS idx_causal_chains_domain ON ia_causal_chains(domain);

-- Tabela de Avaliações Meta-Cognitivas
CREATE TABLE IF NOT EXISTS ia_metacognitive_evaluations (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES ia_conversations(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    quality_score DECIMAL(3,2), -- Qualidade da resposta (0-1)
    confidence_score DECIMAL(3,2), -- Confiança original
    knowledge_gaps JSONB DEFAULT '[]'::jsonb, -- Array de lacunas identificadas
    improvements_suggested JSONB DEFAULT '[]'::jsonb, -- Melhorias sugeridas
    lessons_learned JSONB DEFAULT '[]'::jsonb, -- Lições aprendidas
    metacognitive_notes TEXT, -- Notas meta-cognitivas
    evaluation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para avaliações meta-cognitivas
CREATE INDEX IF NOT EXISTS idx_metacog_conversation ON ia_metacognitive_evaluations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_metacog_quality ON ia_metacognitive_evaluations(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_metacog_timestamp ON ia_metacognitive_evaluations(evaluation_timestamp DESC);

-- Tabela de Histórico de Melhorias Meta-Cognitivas
CREATE TABLE IF NOT EXISTS ia_metacognitive_improvements (
    id SERIAL PRIMARY KEY,
    evaluation_id INTEGER REFERENCES ia_metacognitive_evaluations(id) ON DELETE CASCADE,
    improvement_type VARCHAR(100), -- 'answer_quality', 'knowledge_gap', 'reasoning', 'synthesis'
    improvement_description TEXT NOT NULL,
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMP,
    impact_score DECIMAL(3,2), -- Impacto da melhoria (0-1)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para melhorias
CREATE INDEX IF NOT EXISTS idx_metacog_improvements_eval ON ia_metacognitive_improvements(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_metacog_improvements_applied ON ia_metacognitive_improvements(applied);

-- Tabela de Analogias e Metáforas
CREATE TABLE IF NOT EXISTS ia_analogies (
    id SERIAL PRIMARY KEY,
    source_concept_id INTEGER REFERENCES ia_knowledge_graph_concepts(id) ON DELETE SET NULL,
    target_concept_id INTEGER REFERENCES ia_knowledge_graph_concepts(id) ON DELETE SET NULL,
    analogy_type VARCHAR(100), -- 'structural', 'functional', 'causal', 'relational'
    mapping JSONB NOT NULL, -- Mapeamento entre conceitos: {source_property: target_property, ...}
    strength DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    domain VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para analogias
CREATE INDEX IF NOT EXISTS idx_analogies_source ON ia_analogies(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_analogies_target ON ia_analogies(target_concept_id);
CREATE INDEX IF NOT EXISTS idx_analogies_strength ON ia_analogies(strength DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_kg_concepts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kg_concepts_updated_at
    BEFORE UPDATE ON ia_knowledge_graph_concepts
    FOR EACH ROW
    EXECUTE FUNCTION update_kg_concepts_updated_at();

CREATE TRIGGER trigger_update_kg_relations_updated_at
    BEFORE UPDATE ON ia_knowledge_graph_relations
    FOR EACH ROW
    EXECUTE FUNCTION update_kg_concepts_updated_at();

-- Inserir alguns conceitos iniciais baseados em categorias existentes
DO $$
DECLARE
    cat_id INTEGER;
BEGIN
    -- Buscar categoria "Vendas" se existir
    SELECT id INTO cat_id FROM ia_categories WHERE LOWER(name) = 'vendas' LIMIT 1;
    
    IF cat_id IS NOT NULL THEN
        -- Inserir conceitos básicos de vendas
        INSERT INTO ia_knowledge_graph_concepts (concept_name, concept_type, description, category_id, importance_score)
        VALUES 
            ('Vendas', 'category', 'Processo de vender produtos ou serviços', cat_id, 9.0),
            ('Cliente', 'entity', 'Pessoa ou empresa que compra produtos ou serviços', cat_id, 9.5),
            ('Produto', 'entity', 'Item ou serviço oferecido para venda', cat_id, 9.0),
            ('Estratégia de Vendas', 'concept', 'Plano para alcançar objetivos de vendas', cat_id, 8.5)
        ON CONFLICT (concept_name) DO NOTHING;
    END IF;
END $$;

-- Comentários nas tabelas
COMMENT ON TABLE ia_knowledge_graph_concepts IS 'Conceitos (nós) do grafo de conhecimento';
COMMENT ON TABLE ia_knowledge_graph_relations IS 'Relações (arestas) entre conceitos no grafo';
COMMENT ON TABLE ia_causal_chains IS 'Cadeias causais identificadas (causa → efeito)';
COMMENT ON TABLE ia_metacognitive_evaluations IS 'Avaliações meta-cognitivas das respostas da IA';
COMMENT ON TABLE ia_metacognitive_improvements IS 'Melhorias sugeridas e aplicadas pela meta-cognição';
COMMENT ON TABLE ia_analogies IS 'Analogias e metáforas identificadas entre conceitos';

