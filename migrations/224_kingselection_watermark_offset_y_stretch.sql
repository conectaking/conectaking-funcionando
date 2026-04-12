-- Deslocamento vertical da marca (mosaico / logo), % da altura (-50 a 50).
-- Esticamento do ladrilho em % (100 = sem distorção extra; 50–400).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_offset_y'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_logo_offset_y NUMERIC(5,2) NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_logo_offset_y_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_logo_offset_y_check
      CHECK (watermark_logo_offset_y IS NULL OR (watermark_logo_offset_y >= -50 AND watermark_logo_offset_y <= 50));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_stretch_w_pct'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_stretch_w_pct NUMERIC(6,2) NOT NULL DEFAULT 100;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_stretch_h_pct'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_stretch_h_pct NUMERIC(6,2) NOT NULL DEFAULT 100;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_stretch_w_pct_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_stretch_w_pct_check
      CHECK (watermark_stretch_w_pct >= 50 AND watermark_stretch_w_pct <= 400);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_stretch_h_pct_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_stretch_h_pct_check
      CHECK (watermark_stretch_h_pct >= 50 AND watermark_stretch_h_pct <= 400);
  END IF;
END $$;
