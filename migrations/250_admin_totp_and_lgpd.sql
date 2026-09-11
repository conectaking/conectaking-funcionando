-- Migration: 2FA TOTP para admins + pedidos LGPD
-- Fatias 17 e 19

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS totp_recovery_codes JSONB;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_user ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON account_deletion_requests(status);
