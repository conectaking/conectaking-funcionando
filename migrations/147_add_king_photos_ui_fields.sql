-- KingSelection: campos para UI estilo Alboom na aba Fotos (admin)
-- Idempotente.

ALTER TABLE IF EXISTS king_photos
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS king_photos
  ADD COLUMN IF NOT EXISTS is_cover BOOLEAN NOT NULL DEFAULT FALSE;

-- Garantir 1 capa por galeria
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_king_photos_one_cover_per_gallery'
  ) THEN
    CREATE UNIQUE INDEX idx_king_photos_one_cover_per_gallery
      ON king_photos (gallery_id)
      WHERE is_cover = TRUE;
  END IF;
END $$;

