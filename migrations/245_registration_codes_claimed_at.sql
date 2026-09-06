-- Migration 245: registration_codes.claimed_at (admin codes + dashboard TAG)
ALTER TABLE registration_codes ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP NULL;
UPDATE registration_codes
   SET claimed_at = COALESCE(claimed_at, created_at)
 WHERE is_claimed = TRUE AND claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_registration_codes_claimed_at ON registration_codes(claimed_at);

-- tabela de config de auto-delete (admin códigos)
CREATE TABLE IF NOT EXISTS code_auto_delete_config (
  days_after_expiration INTEGER PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

SELECT 'Migration 245: claimed_at + code_auto_delete_config' AS status;
