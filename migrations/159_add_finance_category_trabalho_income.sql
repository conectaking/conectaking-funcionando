-- Categoria "Trabalho" para RECEITAS (para aparecer em Nova Receita / Categoria)
-- Na migration 096, "Trabalho" existe só como despesa (EXPENSE). Esta migration adiciona "Trabalho" como receita (INCOME).

DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT id FROM users LOOP
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Trabalho' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Trabalho', 'INCOME', 'fa-briefcase', '#22c55e');
        END IF;
    END LOOP;
    RAISE NOTICE 'Categoria Trabalho (receita) adicionada onde não existia.';
END $$;
