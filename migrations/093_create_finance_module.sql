-- Migration: Criar módulo Financeiro
-- Data: 2025-01-31
-- Descrição: Cria todas as tabelas do sistema financeiro com prefixo finance_

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS finance_categories (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de contas financeiras
CREATE TABLE IF NOT EXISTS finance_accounts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('BANK', 'CASH', 'PIX', 'WALLET')),
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de cartões de crédito
CREATE TABLE IF NOT EXISTS finance_cards (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    limit_amount DECIMAL(15,2) NOT NULL,
    closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
    due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de grupos de parcelamento
CREATE TABLE IF NOT EXISTS finance_installment_groups (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255),
    total_amount DECIMAL(15,2) NOT NULL,
    total_installments INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela principal de transações
CREATE TABLE IF NOT EXISTS finance_transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES finance_accounts(id) ON DELETE SET NULL,
    card_id INTEGER REFERENCES finance_cards(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    installment_group_id INTEGER REFERENCES finance_installment_groups(id) ON DELETE SET NULL,
    installment_number INTEGER,
    recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
    recurrence_end_date DATE,
    attachment_url VARCHAR(500),
    tags TEXT[],
    project_name VARCHAR(100),
    cost_center VARCHAR(100),
    client_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS finance_budgets (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    limit_amount DECIMAL(15,2) NOT NULL,
    consider_pending BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category_id, month, year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date ON finance_transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_account ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_card ON finance_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_status ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_finance_categories_user_type ON finance_categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_budgets_user_month_year ON finance_budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_user ON finance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_cards_user ON finance_cards(user_id);

-- Comentários
COMMENT ON TABLE finance_categories IS 'Categorias de receitas e despesas';
COMMENT ON TABLE finance_accounts IS 'Contas financeiras (banco, dinheiro, PIX, carteira)';
COMMENT ON TABLE finance_cards IS 'Cartões de crédito';
COMMENT ON TABLE finance_transactions IS 'Transações financeiras (receitas e despesas)';
COMMENT ON TABLE finance_budgets IS 'Orçamentos mensais por categoria';
COMMENT ON TABLE finance_installment_groups IS 'Grupos de parcelamento';

-- Seed de categorias padrão para receitas (removido - cada usuário criará suas próprias categorias)
-- As categorias serão criadas pelo usuário quando necessário
