-- Migration: Tabela de dívidas Serasa / acordos (Gestão Financeira)
-- Campos para importação por imagem/PDF: empresa origem (ex: Banco Inter), produto/serviço (ex: Cartão de Crédito - CARTÃO GOLD MASTERCARD INTER), etc.

CREATE TABLE IF NOT EXISTS finance_serasa_dividas (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id VARCHAR(255),
    -- Credor (Razão social / FIDC etc.)
    nome VARCHAR(120) NOT NULL,
    -- Empresa de origem (ex: Banco Inter)
    empresa_origem VARCHAR(80),
    -- Produto ou serviço (ex: Cartão de Crédito - CARTÃO GOLD MASTERCARD INTER)
    produto_servico VARCHAR(300),
    numero_contrato VARCHAR(40),
    data_divida VARCHAR(20),
    valor_original DECIMAL(15,2),
    valor_atual DECIMAL(15,2),
    valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    tipo VARCHAR(100),
    contato_banco TEXT,
    pagamentos JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_serasa_dividas_user ON finance_serasa_dividas(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_serasa_dividas_profile ON finance_serasa_dividas(profile_id);
CREATE INDEX IF NOT EXISTS idx_finance_serasa_dividas_nome ON finance_serasa_dividas(user_id, nome);

COMMENT ON TABLE finance_serasa_dividas IS 'Dívidas/acordos Serasa por usuário: empresa origem, produto/serviço, valores e detalhes da negociação.';
COMMENT ON COLUMN finance_serasa_dividas.empresa_origem IS 'Empresa de origem da dívida (ex: Banco Inter).';
COMMENT ON COLUMN finance_serasa_dividas.produto_servico IS 'Produto ou serviço (ex: Cartão de Crédito - CARTÃO GOLD MASTERCARD INTER).';
