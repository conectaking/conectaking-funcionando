-- ===========================================
-- Migration: ângulos do mosaico (H/V) + rotação fina da logomarca
-- Data: 2026-04-11
-- ===========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_tile_angle_landscape'
  ) THEN
    ALTER TABLE king_galleries
      ADD COLUMN watermark_tile_angle_landscape SMALLINT NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_tile_angle_portrait'
  ) THEN
    ALTER TABLE king_galleries
      ADD COLUMN watermark_tile_angle_portrait SMALLINT NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_fine_rotate'
  ) THEN
    ALTER TABLE king_galleries
      ADD COLUMN watermark_logo_fine_rotate SMALLINT NOT NULL DEFAULT 0;
  END IF;
END $$;
