-- Migration: Atualizar account_type_enum com novos planos
-- Data: 2026-01-19
-- Descrição: Adiciona novos tipos de conta para os novos planos e remove o tipo 'free'

DO $$ 
BEGIN
    -- Adicionar novos tipos de conta se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'king_base' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'king_base';
        RAISE NOTICE 'Valor king_base adicionado ao account_type_enum com sucesso!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'king_finance' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'king_finance';
        RAISE NOTICE 'Valor king_finance adicionado ao account_type_enum com sucesso!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'king_finance_plus' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'king_finance_plus';
        RAISE NOTICE 'Valor king_finance_plus adicionado ao account_type_enum com sucesso!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'king_premium_plus' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'king_premium_plus';
        RAISE NOTICE 'Valor king_premium_plus adicionado ao account_type_enum com sucesso!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'king_corporate' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'king_corporate';
        RAISE NOTICE 'Valor king_corporate adicionado ao account_type_enum com sucesso!';
    END IF;
    
    RAISE NOTICE 'Todos os novos tipos de conta foram adicionados!';
    
END $$;

-- Verificar valores do ENUM
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'account_type_enum'
)
ORDER BY enumsortorder;
