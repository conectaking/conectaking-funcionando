-- Código curto para importar formulário (além do link com token)
-- Quem compartilha: gera link + código. Quem recebe: cola o link OU digita o código.

ALTER TABLE profile_items
ADD COLUMN IF NOT EXISTS import_code VARCHAR(12) UNIQUE;

COMMENT ON COLUMN profile_items.import_code IS 'Código curto (ex: KING-A1B2) para importar o formulário sem precisar do link completo.';

CREATE INDEX IF NOT EXISTS idx_profile_items_import_code
ON profile_items(import_code) WHERE import_code IS NOT NULL;
