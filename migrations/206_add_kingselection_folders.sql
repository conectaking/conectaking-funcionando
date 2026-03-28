-- ===========================================
-- Migration: Pastas no King Selection
-- Data: 2026-03-28
-- Descrição:
-- - Cria tabela de pastas por galeria
-- - Adiciona folder_id em king_photos
-- - Permite capa por pasta (cover_photo_id)
-- ===========================================

CREATE TABLE IF NOT EXISTS king_photo_folders (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cover_photo_id INTEGER NULL REFERENCES king_photos(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE king_photos
  ADD COLUMN IF NOT EXISTS folder_id INTEGER NULL REFERENCES king_photo_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_king_photo_folders_gallery
  ON king_photo_folders(gallery_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_king_photos_folder_id
  ON king_photos(folder_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_king_photo_folders_gallery_name
  ON king_photo_folders(gallery_id, lower(name));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_king_photo_folders_updated_at') THEN
      CREATE TRIGGER update_king_photo_folders_updated_at
      BEFORE UPDATE ON king_photo_folders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END$$;

