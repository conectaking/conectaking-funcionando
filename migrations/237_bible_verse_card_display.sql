-- Posição e tamanho do versículo do dia no cartão virtual
ALTER TABLE bible_items
  ADD COLUMN IF NOT EXISTS verse_position VARCHAR(20) NOT NULL DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS verse_size VARCHAR(20) NOT NULL DEFAULT 'normal';

COMMENT ON COLUMN bible_items.verse_position IS 'Onde mostrar a Palavra do Dia no cartão: top | bottom';
COMMENT ON COLUMN bible_items.verse_size IS 'Tamanho do texto: normal | small | xsmall';
