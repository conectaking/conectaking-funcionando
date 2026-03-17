-- Slug legível para link de assinatura (nome do contrato + nome da pessoa)
-- Permite URL como /contract/sign/contrato-adriano-king-2025-joao-silva-abc123
ALTER TABLE ck_contracts_signers
ADD COLUMN IF NOT EXISTS sign_slug VARCHAR(200) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_contracts_signers_sign_slug ON ck_contracts_signers(sign_slug);

COMMENT ON COLUMN ck_contracts_signers.sign_slug IS 'Slug legível para URL de assinatura (contrato + pessoa)';
