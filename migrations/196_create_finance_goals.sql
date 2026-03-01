-- Metas financeiras: nome, valor alvo, data alvo. O "valor já ganho" é a soma de todas as receitas (INCOME PAID) até hoje.
CREATE TABLE IF NOT EXISTS finance_goals (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES finance_profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL CHECK (target_value > 0),
    target_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_goals_user ON finance_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_goals_profile ON finance_goals(profile_id);
COMMENT ON TABLE finance_goals IS 'Metas de receita: valor e data alvo; o progresso usa a soma automática das receitas (INCOME PAID).';
