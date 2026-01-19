-- Migration: Criar sistema de perfis financeiros múltiplos
-- Data: 2026-01-19
-- Descrição: Permite criar múltiplos perfis financeiros (ex: Pessoal, Empresa, Família) dentro da mesma conta

DO $$
BEGIN
    -- Criar tabela de perfis financeiros
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_profiles') THEN
        CREATE TABLE finance_profiles (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            color VARCHAR(7) DEFAULT '#3b82f6',
            icon VARCHAR(50) DEFAULT 'fa-wallet',
            is_primary BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, name)
        );
        
        CREATE INDEX idx_finance_profiles_user_id ON finance_profiles(user_id);
        CREATE INDEX idx_finance_profiles_is_primary ON finance_profiles(user_id, is_primary) WHERE is_primary = TRUE;
        
        RAISE NOTICE 'Tabela finance_profiles criada com sucesso.';
    ELSE
        RAISE NOTICE 'Tabela finance_profiles já existe.';
    END IF;

    -- Adicionar coluna profile_id nas tabelas financeiras existentes
    -- Transações
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_transactions' AND column_name = 'profile_id') THEN
        ALTER TABLE finance_transactions
        ADD COLUMN profile_id INTEGER REFERENCES finance_profiles(id) ON DELETE CASCADE;
        CREATE INDEX idx_finance_transactions_profile_id ON finance_transactions(profile_id);
        RAISE NOTICE 'Coluna profile_id adicionada à tabela finance_transactions.';
    ELSE
        RAISE NOTICE 'Coluna profile_id já existe na tabela finance_transactions.';
    END IF;

    -- Categorias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_categories' AND column_name = 'profile_id') THEN
        ALTER TABLE finance_categories
        ADD COLUMN profile_id INTEGER REFERENCES finance_profiles(id) ON DELETE CASCADE;
        CREATE INDEX idx_finance_categories_profile_id ON finance_categories(profile_id);
        RAISE NOTICE 'Coluna profile_id adicionada à tabela finance_categories.';
    ELSE
        RAISE NOTICE 'Coluna profile_id já existe na tabela finance_categories.';
    END IF;

    -- Contas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'profile_id') THEN
        ALTER TABLE finance_accounts
        ADD COLUMN profile_id INTEGER REFERENCES finance_profiles(id) ON DELETE CASCADE;
        CREATE INDEX idx_finance_accounts_profile_id ON finance_accounts(profile_id);
        RAISE NOTICE 'Coluna profile_id adicionada à tabela finance_accounts.';
    ELSE
        RAISE NOTICE 'Coluna profile_id já existe na tabela finance_accounts.';
    END IF;

    -- Cartões
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_cards' AND column_name = 'profile_id') THEN
        ALTER TABLE finance_cards
        ADD COLUMN profile_id INTEGER REFERENCES finance_profiles(id) ON DELETE CASCADE;
        CREATE INDEX idx_finance_cards_profile_id ON finance_cards(profile_id);
        RAISE NOTICE 'Coluna profile_id adicionada à tabela finance_cards.';
    ELSE
        RAISE NOTICE 'Coluna profile_id já existe na tabela finance_cards.';
    END IF;

    -- Orçamentos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_budgets' AND column_name = 'profile_id') THEN
        ALTER TABLE finance_budgets
        ADD COLUMN profile_id INTEGER REFERENCES finance_profiles(id) ON DELETE CASCADE;
        CREATE INDEX idx_finance_budgets_profile_id ON finance_budgets(profile_id);
        RAISE NOTICE 'Coluna profile_id adicionada à tabela finance_budgets.';
    ELSE
        RAISE NOTICE 'Coluna profile_id já existe na tabela finance_budgets.';
    END IF;

    -- Criar perfil padrão "Principal" para todos os usuários existentes
    INSERT INTO finance_profiles (user_id, name, description, color, icon, is_primary, is_active)
    SELECT DISTINCT 
        u.id,
        'Principal',
        'Perfil financeiro principal',
        '#3b82f6',
        'fa-wallet',
        TRUE,
        TRUE
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM finance_profiles fp WHERE fp.user_id = u.id AND fp.is_primary = TRUE
    )
    ON CONFLICT (user_id, name) DO NOTHING;

    RAISE NOTICE 'Perfis padrão criados para usuários existentes.';

END $$;
