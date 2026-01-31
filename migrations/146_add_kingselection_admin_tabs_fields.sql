-- KingSelection: campos para painel estilo Alboom (abas)
-- Idempotente: só adiciona se não existir.

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'private';

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
  ADD COLUMN IF NOT EXISTS cliente_telefone TEXT;

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS data_trabalho DATE,
  ADD COLUMN IF NOT EXISTS idioma TEXT NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS mensagem_acesso TEXT;

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS allow_download BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_social_sharing BOOLEAN NOT NULL DEFAULT FALSE;

-- Usa watermark_path como "cfimage:<imageId>" quando for logo
ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS watermark_mode TEXT NOT NULL DEFAULT 'x';

CREATE INDEX IF NOT EXISTS idx_king_galleries_profile_item_status
  ON king_galleries (profile_item_id, status, updated_at DESC);

