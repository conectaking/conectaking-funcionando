-- KingSelection: capa de link por foto da galeria OU arquivo externo
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS gallery_link_cover_photo_id INTEGER REFERENCES king_photos(id) ON DELETE SET NULL;

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS gallery_link_cover_file_path TEXT;

CREATE INDEX IF NOT EXISTS idx_king_galleries_link_cover_photo_id
  ON king_galleries (gallery_link_cover_photo_id);
