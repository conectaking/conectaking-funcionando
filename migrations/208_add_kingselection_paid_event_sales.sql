-- ===========================================
-- Migration: Fluxo comercial (Fotos vendidas por evento)
-- Data: 2026-03-28
-- Descrição:
-- - Configuração PIX/comercial por galeria
-- - Pacotes de venda por evento
-- - Comprovantes de pagamento por cliente/rodada
-- - Aprovação por foto para download sem marca
-- - Auditoria de download sem marca
-- ===========================================

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS pix_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS pix_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS pix_instructions TEXT,
  ADD COLUMN IF NOT EXISTS sales_over_limit_policy TEXT NOT NULL DEFAULT 'allow_and_warn',
  ADD COLUMN IF NOT EXISTS sales_price_mode TEXT NOT NULL DEFAULT 'best_price_auto',
  ADD COLUMN IF NOT EXISTS sales_unit_price_cents INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS king_gallery_sale_packages (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_qty INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_gallery_sale_packages_gallery_id
  ON king_gallery_sale_packages(gallery_id, active, sort_order, id);

CREATE TABLE IF NOT EXISTS king_client_payment_requests (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES king_gallery_clients(id) ON DELETE CASCADE,
  selection_batch INTEGER NOT NULL DEFAULT 1,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER,
  proof_file_path TEXT,
  note_client TEXT,
  note_admin TEXT,
  reviewed_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (gallery_id, client_id, selection_batch)
);

CREATE INDEX IF NOT EXISTS idx_king_client_payment_requests_lookup
  ON king_client_payment_requests(gallery_id, client_id, selection_batch, status);

CREATE TABLE IF NOT EXISTS king_selection_photo_approvals (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES king_gallery_clients(id) ON DELETE CASCADE,
  selection_batch INTEGER NOT NULL DEFAULT 1,
  photo_id INTEGER NOT NULL REFERENCES king_photos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  delivery_mode TEXT NOT NULL DEFAULT 'original',
  decided_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (gallery_id, client_id, selection_batch, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_king_selection_photo_approvals_lookup
  ON king_selection_photo_approvals(gallery_id, client_id, selection_batch, status, photo_id);

CREATE TABLE IF NOT EXISTS king_download_audit (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES king_gallery_clients(id) ON DELETE SET NULL,
  photo_id INTEGER REFERENCES king_photos(id) ON DELETE SET NULL,
  selection_batch INTEGER,
  action TEXT NOT NULL DEFAULT 'download_clean',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_download_audit_lookup
  ON king_download_audit(gallery_id, client_id, created_at DESC);

ALTER TABLE IF EXISTS king_photos
  ADD COLUMN IF NOT EXISTS edited_file_path TEXT;

