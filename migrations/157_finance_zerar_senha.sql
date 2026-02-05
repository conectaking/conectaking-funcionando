-- Migration: Senha para zerar mês na Gestão Financeira
-- Cada cliente tem uma senha (padrão 1212) para confirmar "zerar tudo" do mês.
-- Admin pode ver as senhas de todos os clientes (Gestão Financeira).

CREATE TABLE IF NOT EXISTS finance_zerar_senha (
    user_id VARCHAR(255) NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    senha VARCHAR(100) NOT NULL DEFAULT '1212',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_zerar_senha_user ON finance_zerar_senha(user_id);
COMMENT ON TABLE finance_zerar_senha IS 'Senha para confirmar zerar dados do mês na Gestão Financeira (padrão 1212).';
