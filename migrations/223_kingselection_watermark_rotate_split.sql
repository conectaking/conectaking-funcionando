-- Rotação da marca em passos de 90° separada por orientação da foto (retrato vs paisagem).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_rotate_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_rotate_portrait SMALLINT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_rotate_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_rotate_landscape SMALLINT NULL DEFAULT 0;
  END IF;
END $$;

-- Copia valor antigo para ambas as colunas quando ainda NULL
UPDATE king_galleries
SET
  watermark_rotate_portrait = COALESCE(watermark_rotate_portrait, watermark_rotate, 0),
  watermark_rotate_landscape = COALESCE(watermark_rotate_landscape, watermark_rotate, 0)
WHERE watermark_rotate_portrait IS NULL OR watermark_rotate_landscape IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_rotate_portrait_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_rotate_portrait_check
      CHECK (watermark_rotate_portrait IS NULL OR watermark_rotate_portrait IN (0, 90, 180, 270));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_rotate_landscape_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_rotate_landscape_check
      CHECK (watermark_rotate_landscape IS NULL OR watermark_rotate_landscape IN (0, 90, 180, 270));
  END IF;
END $$;
