-- Script SQL para adicionar categoria "Trabalho" aos usuários existentes
-- Execute este script diretamente no banco de dados PostgreSQL

DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Para cada usuário, criar categoria "Trabalho" se não existir
    FOR user_record IN SELECT DISTINCT id FROM users LOOP
        -- Trabalho (Despesa)
        IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE user_id = user_record.id AND name = 'Trabalho' AND type = 'EXPENSE') THEN
            INSERT INTO finance_categories (user_id, name, type, icon, color) 
            VALUES (user_record.id, 'Trabalho', 'EXPENSE', 'fa-briefcase', '#8b5cf6');
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Categoria "Trabalho" adicionada para todos os usuários';
END $$;

-- Verificar resultado
SELECT 
    name,
    type,
    icon,
    color,
    COUNT(*) as total_usuarios
FROM finance_categories
WHERE name = 'Trabalho' AND type = 'EXPENSE'
GROUP BY name, type, icon, color;
