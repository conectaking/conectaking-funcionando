-- Migration 197: KingBrief – contrato de saída único (resumo, topicos, transcricao, mapaMental com sources)
ALTER TABLE kingbrief_meetings ADD COLUMN IF NOT EXISTS contract_json JSONB;
COMMENT ON COLUMN kingbrief_meetings.contract_json IS 'Contrato kingbrief.v1: quality, resumo, topicos, transcricao (segments + timeline_minuto_a_minuto), mapaMental (nodes com sources)';

SELECT 'Migration 197: kingbrief_meetings.contract_json adicionado.' AS status;
