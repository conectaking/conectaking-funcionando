-- Script SQL para atualizar account_type dos usuários existentes
-- Mapeia planos antigos para os novos planos
-- Execute este script diretamente no banco de dados PostgreSQL
--
-- IMPORTANTE: Este script adiciona 'basic' e 'premium' ao enum account_type_enum
-- se ainda não existirem. Execute a migration 104 antes (king_corporate, etc.),
-- ou use migrations/108_add_basic_premium_to_account_type_enum.sql separadamente.

-- 1) Garantir que 'basic' e 'premium' existam no account_type_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'basic' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'basic';
        RAISE NOTICE 'Valor basic adicionado ao account_type_enum.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'premium' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
    ) THEN
        ALTER TYPE account_type_enum ADD VALUE 'premium';
        RAISE NOTICE 'Valor premium adicionado ao account_type_enum.';
    END IF;
END $$;

-- 2) Atualizar usuários com account_type 'individual' para 'basic' (King Start)
UPDATE users
SET account_type = 'basic'
WHERE account_type = 'individual';

-- Atualizar usuários com account_type 'individual_com_logo' para 'premium' (King Prime)
UPDATE users
SET account_type = 'premium'
WHERE account_type = 'individual_com_logo';

-- Atualizar usuários com account_type 'business_owner' para 'king_corporate' (King Corporate)
UPDATE users
SET account_type = 'king_corporate'
WHERE account_type = 'business_owner';

-- Verificar o resultado
SELECT 
    account_type,
    COUNT(*) as total_usuarios
FROM users
GROUP BY account_type
ORDER BY account_type;
