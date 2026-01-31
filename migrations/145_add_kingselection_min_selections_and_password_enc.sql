-- KingSelection: campos opcionais para ficar estilo Alboom
-- - min_selections: seleção mínima (0 = livre)
-- - senha_enc: senha do cliente criptografada (para fotógrafo reenviar)
-- Seguro/Idempotente: só adiciona se não existir.

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS min_selections INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS senha_enc TEXT;

-- Índice opcional para facilitar listagens por status + updated_at (kanban)
CREATE INDEX IF NOT EXISTS idx_king_galleries_status_updated_at
  ON king_galleries (status, updated_at DESC);

