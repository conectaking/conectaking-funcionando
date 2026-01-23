-- Migration: Adicionar campos de recorrência à tabela finance_transactions
-- Data: 2025-01-31
-- Descrição: Adiciona campos is_recurring e recurring_times para suportar transações recorrentes

-- Adicionar coluna is_recurring (booleano para indicar se é recorrente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'finance_transactions' 
        AND column_name = 'is_recurring'
    ) THEN
        ALTER TABLE finance_transactions 
        ADD COLUMN is_recurring BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Coluna is_recurring adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna is_recurring já existe';
    END IF;
END $$;

-- Adicionar coluna recurring_times (número de vezes que deve repetir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'finance_transactions' 
        AND column_name = 'recurring_times'
    ) THEN
        ALTER TABLE finance_transactions 
        ADD COLUMN recurring_times INTEGER;
        
        RAISE NOTICE 'Coluna recurring_times adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna recurring_times já existe';
    END IF;
END $$;

-- Adicionar comentários
COMMENT ON COLUMN finance_transactions.is_recurring IS 'Indica se a transação é recorrente (repetir automaticamente)';
COMMENT ON COLUMN finance_transactions.recurring_times IS 'Número de vezes que a transação deve ser repetida (null = infinito)';
