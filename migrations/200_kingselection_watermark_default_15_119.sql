-- ===========================================
-- Migration: Padrão marca d'água King Selection = 15% transparência, 119% tamanho
-- Data: 2026-03
-- Descrição: Define DEFAULT e atualiza galerias que ainda estão com os antigos 30%/28%.
-- ===========================================

-- Novos valores padrão para colunas (novas linhas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='watermark_opacity') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_opacity SET DEFAULT 0.15;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='watermark_scale') THEN
    ALTER TABLE king_galleries ALTER COLUMN watermark_scale SET DEFAULT 1.19;
  END IF;
END $$;

-- Atualizar galerias que ainda têm os antigos padrões (30% e 28% ou 12%/120%/129%) para 15% e 119%
UPDATE king_galleries
SET
  watermark_opacity = 0.15,
  watermark_scale = 1.19
WHERE (watermark_opacity IS NULL OR watermark_opacity IN (0.30, 0.300, 0.12))
  AND (watermark_scale IS NULL OR watermark_scale IN (0.28, 0.280, 1.20, 1.29));
