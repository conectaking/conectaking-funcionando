-- ===========================================
-- Migration: Seleções por cliente (multi-client)
-- Data: 2026-02-01
-- Descrição:
-- - Adiciona client_id em king_selections para separar seleção por cliente
-- - Cria índices/uniqueness via índices parciais (legacy vs multi-client)
-- - Adiciona status/feedback_cliente em king_gallery_clients (lock por cliente)
-- ===========================================

-- 1) king_selections: adicionar client_id (nullable)
ALTER TABLE king_selections
  ADD COLUMN IF NOT EXISTS client_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_king_selections_gallery_client
  ON king_selections(gallery_id, client_id);

-- 2) Remover UNIQUE antigo (gallery_id, photo_id) se existir
-- Nome padrão do Postgres: king_selections_gallery_id_photo_id_key
ALTER TABLE king_selections
  DROP CONSTRAINT IF EXISTS king_selections_gallery_id_photo_id_key;

-- Em alguns bancos, pode ter outro nome; tenta remover por busca
DO $$
DECLARE
  c_name TEXT;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'king_selections'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(gallery_id, photo_id)%'
  LIMIT 1;

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE king_selections DROP CONSTRAINT IF EXISTS %I', c_name);
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- tabela pode não existir em ambientes incompletos
  NULL;
END$$;

-- 3) Uniqueness correta:
-- - Legacy (sem client_id): uma seleção por foto na galeria
-- - Multi-client (com client_id): uma seleção por foto por cliente
CREATE UNIQUE INDEX IF NOT EXISTS uniq_king_selections_legacy
  ON king_selections(gallery_id, photo_id)
  WHERE client_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_king_selections_per_client
  ON king_selections(gallery_id, client_id, photo_id)
  WHERE client_id IS NOT NULL;

-- FK opcional (não quebra legacy). ON DELETE SET NULL para preservar histórico se cliente for desativado/removido.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='king_gallery_clients') THEN
    -- evita duplicar FK
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'king_selections'::regclass
        AND contype = 'f'
        AND conname = 'fk_king_selections_client_id'
    ) THEN
      ALTER TABLE king_selections
        ADD CONSTRAINT fk_king_selections_client_id
        FOREIGN KEY (client_id)
        REFERENCES king_gallery_clients(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

-- 4) king_gallery_clients: status/feedback por cliente
ALTER TABLE king_gallery_clients
  ADD COLUMN IF NOT EXISTS status king_gallery_status NOT NULL DEFAULT 'andamento';

ALTER TABLE king_gallery_clients
  ADD COLUMN IF NOT EXISTS feedback_cliente TEXT;

CREATE INDEX IF NOT EXISTS idx_king_gallery_clients_status
  ON king_gallery_clients(status);

