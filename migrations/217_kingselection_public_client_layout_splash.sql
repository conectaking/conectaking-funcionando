-- King Selection: layout cliente (pastas vs fotos soltas) + splash de entrada
-- Idempotente

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS client_folder_layout TEXT NOT NULL DEFAULT 'folders';

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS client_entry_splash_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN king_galleries.client_folder_layout IS 'folders = navegação por pastas; flat = uma grelha só (sem pastas no cliente)';
COMMENT ON COLUMN king_galleries.client_entry_splash_enabled IS 'Mostrar capa/tela inicial antes da galeria (usa capa do link)';
