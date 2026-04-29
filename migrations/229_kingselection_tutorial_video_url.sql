-- King Selection: vídeo tutorial no topo (link YouTube/Vimeo/etc.)
-- Idempotente

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS tutorial_video_url TEXT;

COMMENT ON COLUMN king_galleries.tutorial_video_url IS 'URL de vídeo tutorial exibido no topo da galeria do cliente (ex.: YouTube)';

SELECT 'Migration 229: tutorial_video_url adicionado em king_galleries.' AS status;

