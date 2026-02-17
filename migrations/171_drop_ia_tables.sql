-- ============================================
-- Migration 171: Remover tabelas de IA (sistema IA descontinuado)
-- ============================================
-- Remove todas as tabelas ia_* e ai_core_* que não são mais utilizadas.
-- Ordem: tabelas com FK para outras tabelas IA primeiro.

-- AI Core (dependem de ia_conversations ou ai_core_memory)
DROP TABLE IF EXISTS ai_core_supervised_training CASCADE;
DROP TABLE IF EXISTS ai_core_api_learning_history CASCADE;

-- IA: tabelas que referenciam outras tabelas IA
DROP TABLE IF EXISTS ia_user_tutorial_progress CASCADE;
DROP TABLE IF EXISTS ia_learning CASCADE;
DROP TABLE IF EXISTS ia_user_feedback CASCADE;
DROP TABLE IF EXISTS ia_knowledge_corrections CASCADE;
DROP TABLE IF EXISTS ia_knowledge_stats CASCADE;

-- AI Core: demais
DROP TABLE IF EXISTS ai_core_usage_stats CASCADE;
DROP TABLE IF EXISTS ai_core_analysis CASCADE;
DROP TABLE IF EXISTS ai_core_training_rules CASCADE;
DROP TABLE IF EXISTS ai_core_memory CASCADE;

-- IA: tutoriais e assistente
DROP TABLE IF EXISTS ia_assistant_help_history CASCADE;
DROP TABLE IF EXISTS ia_assistant_actions CASCADE;
DROP TABLE IF EXISTS ia_contextual_help CASCADE;
DROP TABLE IF EXISTS ia_tutorials CASCADE;

-- IA: aprendizado adaptativo
DROP TABLE IF EXISTS ia_adaptive_learning_history CASCADE;
DROP TABLE IF EXISTS ia_response_strategies CASCADE;
DROP TABLE IF EXISTS ia_repetitive_errors CASCADE;

-- IA: embeddings e métricas
DROP TABLE IF EXISTS ia_vector_search_metrics CASCADE;
DROP TABLE IF EXISTS ia_embedding_cache CASCADE;

-- IA: descoberta de categorias
DROP TABLE IF EXISTS ia_category_usage_analysis CASCADE;
DROP TABLE IF EXISTS ia_category_discovery CASCADE;

-- IA: knowledge graph
DROP TABLE IF EXISTS ia_analogies CASCADE;
DROP TABLE IF EXISTS ia_metacognitive_improvements CASCADE;
DROP TABLE IF EXISTS ia_metacognitive_evaluations CASCADE;
DROP TABLE IF EXISTS ia_causal_chains CASCADE;
DROP TABLE IF EXISTS ia_knowledge_graph_relations CASCADE;
DROP TABLE IF EXISTS ia_knowledge_graph_concepts CASCADE;

-- IA: monitoramento
DROP TABLE IF EXISTS ia_system_analyses CASCADE;
DROP TABLE IF EXISTS ia_system_metrics CASCADE;
DROP TABLE IF EXISTS ia_system_fix_history CASCADE;
DROP TABLE IF EXISTS ia_system_fixes CASCADE;
DROP TABLE IF EXISTS ia_system_errors CASCADE;
DROP TABLE IF EXISTS ia_system_monitoring CASCADE;

-- IA: melhorias (cache, contexto, sugestões, satisfação)
DROP TABLE IF EXISTS ia_satisfaction_metrics CASCADE;
DROP TABLE IF EXISTS ia_question_suggestions CASCADE;
DROP TABLE IF EXISTS ia_conversation_context CASCADE;
DROP TABLE IF EXISTS ia_response_cache CASCADE;
DROP TABLE IF EXISTS ia_user_preferences CASCADE;

-- IA: mentorias e web search
DROP TABLE IF EXISTS ia_web_search_history CASCADE;
DROP TABLE IF EXISTS ia_web_search_cache CASCADE;
DROP TABLE IF EXISTS ia_web_search_config CASCADE;
DROP TABLE IF EXISTS ia_mentorias CASCADE;

-- IA: base (023)
DROP TABLE IF EXISTS ia_conversations CASCADE;
DROP TABLE IF EXISTS ia_statistics CASCADE;
DROP TABLE IF EXISTS ia_qa CASCADE;
DROP TABLE IF EXISTS ia_documents CASCADE;
DROP TABLE IF EXISTS ia_knowledge_base CASCADE;
DROP TABLE IF EXISTS ia_categories CASCADE;
