-- Script para verificar itens no banco de dados

-- 1. Ver TODOS os itens do seu usuário (substitua 'ADRIANO-KING' pelo seu user_id)
SELECT 
    id,
    user_id,
    item_type,
    title,
    is_active,
    display_order,
    destination_url,
    created_at
FROM profile_items
WHERE user_id = 'ADRIANO-KING'
ORDER BY display_order ASC;

-- 2. Ver apenas itens ATIVOS
SELECT 
    id,
    item_type,
    title,
    is_active,
    display_order
FROM profile_items
WHERE user_id = 'ADRIANO-KING' 
AND is_active = true
ORDER BY display_order ASC;

-- 3. Ver quantos itens têm cada status
SELECT 
    is_active,
    COUNT(*) as quantidade
FROM profile_items
WHERE user_id = 'ADRIANO-KING'
GROUP BY is_active;

