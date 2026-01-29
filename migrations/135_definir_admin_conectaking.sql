-- Migration: Definir usuário conectaking@gmail.com como administrador
-- Descrição: Marca is_admin = true para o email conectaking@gmail.com
-- Data: 2026-01-28

-- Garantir que a coluna is_admin existe (caso não exista em ambientes antigos)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Definir conectaking@gmail.com como administrador
UPDATE users
SET is_admin = true
WHERE LOWER(TRIM(email)) = 'conectaking@gmail.com';
