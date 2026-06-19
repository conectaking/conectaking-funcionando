-- Pedidos de edição no modo público (cliente marca fotos e envia ao fotógrafo).
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS allow_client_edit_request BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN king_galleries.allow_client_edit_request IS
  'Modo público: permite ao cliente enviar fotos marcadas como pedido de edição ao fotógrafo.';

CREATE TABLE IF NOT EXISTS king_client_edit_requests (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES king_gallery_clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note_client TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS king_client_edit_request_photos (
  edit_request_id INTEGER NOT NULL REFERENCES king_client_edit_requests(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES king_photos(id) ON DELETE CASCADE,
  PRIMARY KEY (edit_request_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_king_edit_requests_gallery_status
  ON king_client_edit_requests(gallery_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_king_edit_requests_gallery_client
  ON king_client_edit_requests(gallery_id, client_id);

SELECT 'Migration 235: kingselection client edit requests' AS status;
