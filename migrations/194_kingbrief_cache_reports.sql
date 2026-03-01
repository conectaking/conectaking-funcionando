-- ===========================================
-- Migration 194: Cache dos relatórios KingBrief (Negócio, Aula, Comunicação)
-- Evita chamar o GPT sempre; primeira vez gera e grava, seguintes devolvem do BD.
-- ===========================================

ALTER TABLE kingbrief_meetings
ADD COLUMN IF NOT EXISTS business_json JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lesson_json JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS communication_json JSONB DEFAULT NULL;

COMMENT ON COLUMN kingbrief_meetings.business_json IS 'Cache do relatório Modo Negócio (GET :id/business)';
COMMENT ON COLUMN kingbrief_meetings.lesson_json IS 'Cache do relatório Modo Aula (GET :id/lesson)';
COMMENT ON COLUMN kingbrief_meetings.communication_json IS 'Cache da análise de comunicação (GET :id/communication)';

SELECT 'Migration 194: Colunas de cache business_json, lesson_json, communication_json adicionadas.' AS status;
