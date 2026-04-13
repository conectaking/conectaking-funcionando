-- ===========================================
-- Migration 227: King Docs — cofre e partilhas temporárias (módulo isolado)
-- ===========================================

CREATE TABLE IF NOT EXISTS king_docs_vault (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  field_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS king_docs_files (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type VARCHAR(80) NOT NULL,
  storage_key TEXT NOT NULL,
  mime VARCHAR(120),
  original_name VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_docs_files_user ON king_docs_files(user_id);

CREATE TABLE IF NOT EXISTS king_docs_share_links (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}',
  password_hash TEXT,
  viewer_token VARCHAR(64),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_docs_shares_user ON king_docs_share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_king_docs_shares_expires ON king_docs_share_links(expires_at);

-- Disponível em todos os planos ativos (ajustar no admin se necessário)
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
SELECT 'king_docs', sp.plan_code, true
FROM subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM module_plan_availability m
    WHERE m.module_type = 'king_docs' AND m.plan_code = sp.plan_code
  );

SELECT 'Migration 227: King Docs OK.' AS status;
