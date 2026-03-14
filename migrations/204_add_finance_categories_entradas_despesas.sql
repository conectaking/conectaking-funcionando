-- Migration: Novas categorias para gestão financeira - Entradas e Despesas
-- Data: 2026-03-14
-- Descrição: Adiciona categorias em Entradas (INCOME) e Despesas (EXPENSE) para Novo Lançamento

DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT id FROM users LOOP
        -- ========== ENTRADAS (INCOME) ==========
        -- Presentes
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Presentes' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Presentes', 'INCOME', 'fa-gift', '#ec4899');
        END IF;
        -- Trabalhos
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Trabalhos' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Trabalhos', 'INCOME', 'fa-briefcase', '#22c55e');
        END IF;
        -- Serviços
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Serviços' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Serviços', 'INCOME', 'fa-tools', '#14b8a6');
        END IF;
        -- Lanches
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Lanches' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Lanches', 'INCOME', 'fa-coffee', '#f59e0b');
        END IF;
        -- Almoço
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Almoço' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Almoço', 'INCOME', 'fa-utensils', '#10b981');
        END IF;
        -- Alimentação diária
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Alimentação diária' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Alimentação diária', 'INCOME', 'fa-apple-alt', '#84cc16');
        END IF;

        -- ========== DESPESAS (EXPENSE) ==========
        -- Despesas diárias
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Despesas diárias' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Despesas diárias', 'EXPENSE', 'fa-calendar-day', '#6366f1');
        END IF;
        -- Dízimos
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Dízimos' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Dízimos', 'EXPENSE', 'fa-hand-holding-heart', '#8b5cf6');
        END IF;
        -- Despesa de casa
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Despesa de casa' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Despesa de casa', 'EXPENSE', 'fa-home', '#ef4444');
        END IF;
        -- Alimentações
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Alimentações' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Alimentações', 'EXPENSE', 'fa-utensils', '#f97316');
        END IF;
        -- Manutenção de equipamento
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Manutenção de equipamento' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color)
            VALUES (user_record.id, 'Manutenção de equipamento', 'EXPENSE', 'fa-wrench', '#0ea5e9');
        END IF;
    END LOOP;
    RAISE NOTICE 'Categorias de Entradas e Despesas adicionadas para todos os usuários.';
END $$;
