-- ===========================================
-- Migration: Expandir watermark_scale para até 5.0 (500%)
-- Data: 2026-01-31
-- ===========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='king_galleries_watermark_scale_check') THEN
    ALTER TABLE king_galleries DROP CONSTRAINT king_galleries_watermark_scale_check;
  END IF;

  ALTER TABLE king_galleries
    ADD CONSTRAINT king_galleries_watermark_scale_check
    CHECK (watermark_scale IS NULL OR (watermark_scale >= 0.10 AND watermark_scale <= 5.00));
END $$;

