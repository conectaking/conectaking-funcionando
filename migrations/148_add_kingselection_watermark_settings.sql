-- ===========================================
-- Migration: watermark_opacity / watermark_scale (KingSelection)
-- Data: 2026-01-31
-- Descrição: Permite ajustar intensidade e tamanho da marca d'água (logo ou X)
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='king_galleries' AND column_name='watermark_opacity'
  ) THEN
    ALTER TABLE king_galleries
      ADD COLUMN watermark_opacity NUMERIC(4,3) DEFAULT 0.300;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='king_galleries' AND column_name='watermark_scale'
  ) THEN
    ALTER TABLE king_galleries
      ADD COLUMN watermark_scale NUMERIC(4,3) DEFAULT 0.280;
  END IF;
END $$;

-- Constraints (tolerantes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='king_galleries_watermark_opacity_check'
  ) THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_opacity_check
      CHECK (watermark_opacity IS NULL OR (watermark_opacity >= 0.05 AND watermark_opacity <= 0.80));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='king_galleries_watermark_scale_check'
  ) THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_scale_check
      CHECK (watermark_scale IS NULL OR (watermark_scale >= 0.10 AND watermark_scale <= 0.45));
  END IF;
END $$;

