-- Migration: Token para compartilhar formulário pronto (importar em outra conta)
-- Quem recebe o link, ao abrir logado, importa uma cópia do formulário na própria conta.

ALTER TABLE profile_items
ADD COLUMN IF NOT EXISTS import_token VARCHAR(64) UNIQUE;

COMMENT ON COLUMN profile_items.import_token IS 'Token para link "Compartilhar formulário pronto". Quem abrir o link (logado) importa uma cópia do formulário.';

CREATE INDEX IF NOT EXISTS idx_profile_items_import_token
ON profile_items(import_token) WHERE import_token IS NOT NULL;
