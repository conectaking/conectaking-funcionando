-- Deslocamento horizontal da marca (logomarca central / mosaico), em % da largura da foto (-50 a 50).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_offset_x'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_logo_offset_x NUMERIC(5,2) NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_logo_offset_x_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_logo_offset_x_check
      CHECK (watermark_logo_offset_x IS NULL OR (watermark_logo_offset_x >= -50 AND watermark_logo_offset_x <= 50));
  END IF;
END $$;
