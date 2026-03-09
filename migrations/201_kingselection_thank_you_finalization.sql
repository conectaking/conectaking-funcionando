-- KingSelection: página de finalização / mensagem de obrigado personalizável
-- Campos para o fotógrafo configurar título, mensagem e imagem da página de obrigado.

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS thank_you_title TEXT;

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS thank_you_message TEXT;

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS thank_you_image_url TEXT;

COMMENT ON COLUMN king_galleries.thank_you_title IS 'Título da página de obrigado (ex.: Obrigado!)';
COMMENT ON COLUMN king_galleries.thank_you_message IS 'Mensagem personalizada da página de finalização (pode usar {{nome}} para o nome do fotógrafo, {{quantidade}} para nº de fotos)';
COMMENT ON COLUMN king_galleries.thank_you_image_url IS 'URL da imagem de destaque na página de obrigado (opcional)';
