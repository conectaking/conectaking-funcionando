-- KingSelection: altura configurável dos cards no cliente
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS client_card_height_px INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'king_galleries'
      AND column_name = 'client_card_height_px'
  ) THEN
    UPDATE king_galleries
    SET client_card_height_px = 220
    WHERE client_card_height_px IS NULL;
  END IF;
END $$;
