-- Migration: Adicionar 'basic' e 'premium' ao account_type_enum
-- Data: 2026-01-19
-- Descrição: Valores usados em users.account_type para King Start (basic) e King Prime (premium).
--            Necessário para atualizar_planos_usuarios.sql e painel Admin (Gerenciar Usuários).

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'basic' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'basic';
        RAISE NOTICE 'Valor basic adicionado ao account_type_enum com sucesso!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'premium' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'premium';
        RAISE NOTICE 'Valor premium adicionado ao account_type_enum com sucesso!';
    END IF;
    
    RAISE NOTICE 'Valores basic e premium conferidos no account_type_enum.';
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
