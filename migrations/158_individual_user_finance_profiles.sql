-- Quantidade de perfis de Gestão Financeira por usuário (Separação de pacotes - planos individuais)
-- Permite ao ADM definir 1, 2, 3, 4+ perfis para um usuário específico.

CREATE TABLE IF NOT EXISTS individual_user_finance_profiles (
    user_id VARCHAR(255) NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_finance_profiles INTEGER NOT NULL DEFAULT 1 CHECK (max_finance_profiles >= 1 AND max_finance_profiles <= 20),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE individual_user_finance_profiles IS 'Override de quantidade de perfis de Gestão Financeira por usuário (Separação de pacotes).';
