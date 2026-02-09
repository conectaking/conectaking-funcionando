-- Migration: Adicionar categoria de despesa "Pensão" para todos os usuários
-- Data: 2026-02-09
-- Descrição: Insere a categoria Pensão (despesa) para usuários que ainda não a possuem

DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT id FROM users LOOP
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Pensão' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Pensão', 'EXPENSE', 'fa-hand-holding-usd', '#0ea5e9');
        END IF;
    END LOOP;
    RAISE NOTICE 'Categoria Pensão (despesa) adicionada para usuários que não tinham.';
END $$;
