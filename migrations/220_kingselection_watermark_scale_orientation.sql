-- ===========================================
-- Migration 220: Escala de marca d'água por orientação (retrato / paisagem)
-- Data: 2026-04-11
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_scale_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_scale_portrait NUMERIC(5,2) NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_scale_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_scale_landscape NUMERIC(5,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_scale_portrait_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_scale_portrait_check
      CHECK (watermark_scale_portrait IS NULL OR (watermark_scale_portrait >= 0.10 AND watermark_scale_portrait <= 5.00));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_scale_landscape_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_scale_landscape_check
      CHECK (watermark_scale_landscape IS NULL OR (watermark_scale_landscape >= 0.10 AND watermark_scale_landscape <= 5.00));
  END IF;
END $$;
