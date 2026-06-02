-- titulo estava VARCHAR(255) — texto colado inteiro no título causava erro 22001 ao salvar

ALTER TABLE bible_prosperidade_ativacoes
    ALTER COLUMN titulo TYPE TEXT;

-- Corrige títulos já gravados com texto colado indevidamente (corta na 1ª aspas / emoji de seção)
UPDATE bible_prosperidade_ativacoes
SET titulo = LEFT(TRIM(
    CASE
        WHEN position('"' in titulo) > 1 THEN substring(titulo from 1 for position('"' in titulo) - 1)
        WHEN position('“' in titulo) > 1 THEN substring(titulo from 1 for position('“' in titulo) - 1)
        ELSE titulo
    END
), 200)
WHERE titulo IS NOT NULL
  AND length(titulo) > 80;
