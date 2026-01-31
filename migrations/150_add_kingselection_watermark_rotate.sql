-- ===========================================
-- Migration: watermark_rotate (KingSelection)
-- Data: 2026-01-31
-- Descrição: Permite corrigir rotação da logomarca (0/90/180/270)
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='king_galleries' AND column_name='watermark_rotate'
  ) THEN
    ALTER TABLE king_galleries
      ADD COLUMN watermark_rotate INT DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='king_galleries_watermark_rotate_check') THEN
    ALTER TABLE king_galleries DROP CONSTRAINT king_galleries_watermark_rotate_check;
  END IF;
  ALTER TABLE king_galleries
    ADD CONSTRAINT king_galleries_watermark_rotate_check
    CHECK (watermark_rotate IS NULL OR watermark_rotate IN (0, 90, 180, 270));
END $$;

