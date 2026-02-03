-- ===========================================
-- Migration: Expandir ranges de watermark (KingSelection)
-- Data: 2026-01-31
-- - opacity: 0.00 .. 1.00
-- - scale:   0.10 .. 0.85
-- ===========================================
-- Ajusta dados fora do novo range antes de criar a constraint para evitar violação.

DO $$
BEGIN
  -- Opacity
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='king_galleries_watermark_opacity_check') THEN
    ALTER TABLE king_galleries DROP CONSTRAINT king_galleries_watermark_opacity_check;
  END IF;
  UPDATE king_galleries
  SET watermark_opacity = LEAST(GREATEST(COALESCE(watermark_opacity, 0.30), 0.00), 1.00)
  WHERE watermark_opacity IS NOT NULL AND (watermark_opacity < 0.00 OR watermark_opacity > 1.00);
  ALTER TABLE king_galleries
    ADD CONSTRAINT king_galleries_watermark_opacity_check
    CHECK (watermark_opacity IS NULL OR (watermark_opacity >= 0.00 AND watermark_opacity <= 1.00));

  -- Scale: corrige valores fora de 0.10..0.85 antes de adicionar a constraint
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='king_galleries_watermark_scale_check') THEN
    ALTER TABLE king_galleries DROP CONSTRAINT king_galleries_watermark_scale_check;
  END IF;
  UPDATE king_galleries
  SET watermark_scale = LEAST(GREATEST(COALESCE(watermark_scale, 0.28), 0.10), 0.85)
  WHERE watermark_scale IS NOT NULL AND (watermark_scale < 0.10 OR watermark_scale > 0.85);
  ALTER TABLE king_galleries
    ADD CONSTRAINT king_galleries_watermark_scale_check
    CHECK (watermark_scale IS NULL OR (watermark_scale >= 0.10 AND watermark_scale <= 0.85));
END $$;

