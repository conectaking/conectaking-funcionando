-- Marca d'água separada: ficheiro para fotos verticais (retrato) e horizontais (paisagem).
-- Se uma coluna for NULL, usa-se watermark_path (legado) como fallback.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_path_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_path_portrait TEXT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_path_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_path_landscape TEXT NULL;
  END IF;
END $$;
