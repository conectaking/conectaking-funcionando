-- King Finance: coleções sync (dívidas/terceiros/trabalhos/bens) em linhas
-- em vez de um único blob JSONB. Mantém finance_king_sync como espelho legado.

CREATE TABLE IF NOT EXISTS finance_king_items (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id VARCHAR(255) NOT NULL DEFAULT '',
    kind VARCHAR(20) NOT NULL,
    item_key VARCHAR(80) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_king_items_kind_chk CHECK (kind IN ('dividas', 'terceiros', 'trabalhos', 'bens')),
    CONSTRAINT finance_king_items_uniq UNIQUE (user_id, profile_id, kind, item_key)
);

CREATE INDEX IF NOT EXISTS idx_finance_king_items_user_profile
    ON finance_king_items (user_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_finance_king_items_kind
    ON finance_king_items (user_id, profile_id, kind);

COMMENT ON TABLE finance_king_items IS 'Itens King Finance normalizados (Serasa, Quem eu devo, trabalhos, bens).';
