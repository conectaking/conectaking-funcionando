-- Qualidade máxima de lado longo para preview/download do cliente (KingSelection)
ALTER TABLE king_galleries ADD COLUMN IF NOT EXISTS client_image_quality VARCHAR(16) NOT NULL DEFAULT 'low';
COMMENT ON COLUMN king_galleries.client_image_quality IS 'low (~1200px), hd (~2400), max (~5000) — JPEG para preview com marca dágua';
