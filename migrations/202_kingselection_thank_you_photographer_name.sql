-- KingSelection: nome do fotógrafo na mensagem de obrigado (preenchido na página de config)
-- O sistema substitui {{nome}} por este valor e {{quantidade}} pelo número de fotos na hora de exibir.

ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS thank_you_photographer_name VARCHAR(255);

COMMENT ON COLUMN king_galleries.thank_you_photographer_name IS 'Nome exibido na mensagem de obrigado (substitui {{nome}})';
