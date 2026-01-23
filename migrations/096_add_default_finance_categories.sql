-- Migration: Adicionar categorias padrão para o módulo financeiro
-- Data: 2025-01-31
-- Descrição: Cria categorias padrão com ícones para receitas e despesas

-- Função para criar categorias padrão para cada usuário existente
DO $$
DECLARE
    user_record RECORD;
    category_icon VARCHAR(50);
    category_color VARCHAR(7);
BEGIN
    -- Para cada usuário, criar categorias padrão se não existirem
    FOR user_record IN SELECT DISTINCT id FROM users LOOP
        -- CATEGORIAS DE DESPESAS
        -- Aluguel
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Aluguel' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Aluguel', 'EXPENSE', 'fa-home', '#ef4444');
        END IF;
        
        -- Luz
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Luz' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Luz', 'EXPENSE', 'fa-lightbulb', '#fbbf24');
        END IF;
        
        -- Água
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Água' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Água', 'EXPENSE', 'fa-tint', '#3b82f6');
        END IF;
        
        -- Internet
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Internet' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Internet', 'EXPENSE', 'fa-wifi', '#8b5cf6');
        END IF;
        
        -- Cartão de Crédito
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Cartão de Crédito' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Cartão de Crédito', 'EXPENSE', 'fa-credit-card', '#ec4899');
        END IF;
        
        -- Supermercado
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Supermercado' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Supermercado', 'EXPENSE', 'fa-shopping-cart', '#10b981');
        END IF;
        
        -- Transporte
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Transporte' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Transporte', 'EXPENSE', 'fa-car', '#6366f1');
        END IF;
        
        -- Saúde
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Saúde' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Saúde', 'EXPENSE', 'fa-heart', '#f43f5e');
        END IF;
        
        -- Educação
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Educação' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Educação', 'EXPENSE', 'fa-graduation-cap', '#06b6d4');
        END IF;
        
        -- Lazer
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Lazer' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Lazer', 'EXPENSE', 'fa-gamepad', '#a855f7');
        END IF;
        
        -- Trabalho
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Trabalho' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Trabalho', 'EXPENSE', 'fa-briefcase', '#8b5cf6');
        END IF;
        
        -- CATEGORIAS DE RECEITAS
        -- Salário
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Salário' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Salário', 'INCOME', 'fa-briefcase', '#22c55e');
        END IF;
        
        -- Freelance
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Freelance' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Freelance', 'INCOME', 'fa-laptop-code', '#14b8a6');
        END IF;
        
        -- Vendas
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Vendas' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Vendas', 'INCOME', 'fa-store', '#10b981');
        END IF;
        
        -- Investimentos
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Investimentos' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Investimentos', 'INCOME', 'fa-chart-line', '#3b82f6');
        END IF;
        
        -- Outros
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Outros' AND type = 'INCOME') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Outros', 'INCOME', 'fa-ellipsis-h', '#6b7280');
        END IF;
        
        -- Outros (Despesas)
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Outros' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Outros', 'EXPENSE', 'fa-ellipsis-h', '#6b7280');
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Categorias padrão criadas para todos os usuários';
END $$;
