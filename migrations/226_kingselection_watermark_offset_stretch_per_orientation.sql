-- Deslocamento e esticar do mosaico por orientação da foto (retrato vs paisagem).
-- Legado: watermark_logo_offset_x/y e watermark_stretch_* continuam; se as novas colunas forem NULL, o servidor usa o legado.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_offset_x_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_logo_offset_x_portrait NUMERIC(5,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_offset_y_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_logo_offset_y_portrait NUMERIC(5,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_offset_x_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_logo_offset_x_landscape NUMERIC(5,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_logo_offset_y_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_logo_offset_y_landscape NUMERIC(5,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_stretch_w_pct_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_stretch_w_pct_portrait NUMERIC(6,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_stretch_h_pct_portrait'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_stretch_h_pct_portrait NUMERIC(6,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_stretch_w_pct_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_stretch_w_pct_landscape NUMERIC(6,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'king_galleries' AND column_name = 'watermark_stretch_h_pct_landscape'
  ) THEN
    ALTER TABLE king_galleries ADD COLUMN watermark_stretch_h_pct_landscape NUMERIC(6,2) NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_logo_offset_x_portrait_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_logo_offset_x_portrait_check
      CHECK (watermark_logo_offset_x_portrait IS NULL OR (watermark_logo_offset_x_portrait >= -50 AND watermark_logo_offset_x_portrait <= 50));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_logo_offset_y_portrait_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_logo_offset_y_portrait_check
      CHECK (watermark_logo_offset_y_portrait IS NULL OR (watermark_logo_offset_y_portrait >= -50 AND watermark_logo_offset_y_portrait <= 50));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_logo_offset_x_landscape_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_logo_offset_x_landscape_check
      CHECK (watermark_logo_offset_x_landscape IS NULL OR (watermark_logo_offset_x_landscape >= -50 AND watermark_logo_offset_x_landscape <= 50));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_logo_offset_y_landscape_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_logo_offset_y_landscape_check
      CHECK (watermark_logo_offset_y_landscape IS NULL OR (watermark_logo_offset_y_landscape >= -50 AND watermark_logo_offset_y_landscape <= 50));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_stretch_w_pct_portrait_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_stretch_w_pct_portrait_check
      CHECK (watermark_stretch_w_pct_portrait IS NULL OR (watermark_stretch_w_pct_portrait >= 50 AND watermark_stretch_w_pct_portrait <= 400));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_stretch_h_pct_portrait_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_stretch_h_pct_portrait_check
      CHECK (watermark_stretch_h_pct_portrait IS NULL OR (watermark_stretch_h_pct_portrait >= 50 AND watermark_stretch_h_pct_portrait <= 400));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_stretch_w_pct_landscape_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_stretch_w_pct_landscape_check
      CHECK (watermark_stretch_w_pct_landscape IS NULL OR (watermark_stretch_w_pct_landscape >= 50 AND watermark_stretch_w_pct_landscape <= 400));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'king_galleries_watermark_stretch_h_pct_landscape_check') THEN
    ALTER TABLE king_galleries
      ADD CONSTRAINT king_galleries_watermark_stretch_h_pct_landscape_check
      CHECK (watermark_stretch_h_pct_landscape IS NULL OR (watermark_stretch_h_pct_landscape >= 50 AND watermark_stretch_h_pct_landscape <= 400));
  END IF;
END $$;

-- Copiar valores legados para as colunas novas (uma vez), para não “zerar” quem já tinha ajustes.
UPDATE king_galleries SET
  watermark_logo_offset_x_portrait = COALESCE(watermark_logo_offset_x_portrait, watermark_logo_offset_x),
  watermark_logo_offset_y_portrait = COALESCE(watermark_logo_offset_y_portrait, watermark_logo_offset_y),
  watermark_logo_offset_x_landscape = COALESCE(watermark_logo_offset_x_landscape, watermark_logo_offset_x),
  watermark_logo_offset_y_landscape = COALESCE(watermark_logo_offset_y_landscape, watermark_logo_offset_y),
  watermark_stretch_w_pct_portrait = COALESCE(watermark_stretch_w_pct_portrait, watermark_stretch_w_pct),
  watermark_stretch_h_pct_portrait = COALESCE(watermark_stretch_h_pct_portrait, watermark_stretch_h_pct),
  watermark_stretch_w_pct_landscape = COALESCE(watermark_stretch_w_pct_landscape, watermark_stretch_w_pct),
  watermark_stretch_h_pct_landscape = COALESCE(watermark_stretch_h_pct_landscape, watermark_stretch_h_pct)
WHERE
  watermark_logo_offset_x IS NOT NULL OR watermark_logo_offset_y IS NOT NULL
  OR watermark_stretch_w_pct IS NOT NULL OR watermark_stretch_h_pct IS NOT NULL;
