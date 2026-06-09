-- ===========================================
-- Migration: Padrão oficial marca d'água Conecta King (tile_dense)
-- Retrato 150% / 0° | Paisagem 98% / 90° | centro | esticar 100%
-- ===========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_scale') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_scale SET DEFAULT 1.5;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_scale_portrait') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_scale_portrait SET DEFAULT 1.5;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_scale_landscape') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_scale_landscape SET DEFAULT 0.98;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_rotate_portrait') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_rotate_portrait SET DEFAULT 0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_rotate_landscape') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_rotate_landscape SET DEFAULT 90;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_mode') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_mode SET DEFAULT 'tile_dense';
  END IF;
END $$;

-- Galerias sem marca personalizada: aplicar padrão oficial (não altera modo logo/none)
UPDATE king_galleries
SET
  watermark_mode = 'tile_dense',
  watermark_scale = 1.5,
  watermark_scale_portrait = 1.5,
  watermark_scale_landscape = 0.98,
  watermark_rotate = 0,
  watermark_rotate_portrait = 0,
  watermark_rotate_landscape = 90,
  watermark_logo_fine_rotate = 0,
  watermark_tile_angle_portrait = 0,
  watermark_tile_angle_landscape = 0,
  watermark_logo_offset_x = 0,
  watermark_logo_offset_y = 0,
  watermark_logo_offset_x_portrait = 0,
  watermark_logo_offset_y_portrait = 0,
  watermark_logo_offset_x_landscape = 0,
  watermark_logo_offset_y_landscape = 0,
  watermark_stretch_w_pct = 100,
  watermark_stretch_h_pct = 100,
  watermark_stretch_w_pct_portrait = 100,
  watermark_stretch_h_pct_portrait = 100,
  watermark_stretch_w_pct_landscape = 100,
  watermark_stretch_h_pct_landscape = 100,
  updated_at = NOW()
WHERE
  COALESCE(NULLIF(TRIM(watermark_path), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(watermark_path_portrait), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(watermark_path_landscape), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(watermark_mode), ''), 'tile_dense') NOT IN ('logo', 'none');
