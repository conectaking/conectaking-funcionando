-- Migration 196: KingBrief – segmentos com tempo, resumo estratégico e partes importantes
-- transcript_segments_json: [ { start_sec, end_sec, text } ] para transcrição minuto a minuto
-- summary_strategic: resumo em modo estratégico (bullets, decisões, próximos passos)
-- highlights_json: [ "frase importante 1", "..." ] trechos mais relevantes

ALTER TABLE kingbrief_meetings
  ADD COLUMN IF NOT EXISTS transcript_segments_json JSONB,
  ADD COLUMN IF NOT EXISTS summary_strategic TEXT,
  ADD COLUMN IF NOT EXISTS highlights_json JSONB;

COMMENT ON COLUMN kingbrief_meetings.transcript_segments_json IS 'Segmentos com tempo: [ { start_sec, end_sec, text } ]';
COMMENT ON COLUMN kingbrief_meetings.summary_strategic IS 'Resumo estratégico (bullets, decisões, próximos passos)';
COMMENT ON COLUMN kingbrief_meetings.highlights_json IS 'Trechos mais importantes da reunião (array de strings)';

SELECT 'Migration 196: kingbrief segmentos, summary_strategic e highlights adicionados.' AS status;
