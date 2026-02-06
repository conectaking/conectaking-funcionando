-- Sincronização Gestão Financeira: Serasa (dividas) + Quem eu devo (terceiros)
-- Um registro por usuário + perfil; dados em JSONB para funcionar em localhost, site e mobile.

CREATE TABLE IF NOT EXISTS finance_king_sync (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id VARCHAR(255) NOT NULL DEFAULT '',
    data JSONB NOT NULL DEFAULT '{"dividas":[],"terceiros":[]}',
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_king_sync_user ON finance_king_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_king_sync_profile ON finance_king_sync(user_id, profile_id);

COMMENT ON TABLE finance_king_sync IS 'Dados King Finance por usuário/perfil: dividas (Serasa) e terceiros (Quem eu devo) para sync localhost/site/mobile.';
