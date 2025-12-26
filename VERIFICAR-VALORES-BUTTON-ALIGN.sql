-- Script para verificar os valores atuais de button_content_align nos perfis

-- 1. Ver TODOS os valores atuais nos perfis
SELECT 
    user_id,
    button_content_align,
    display_name
FROM user_profiles
ORDER BY user_id
LIMIT 20;

-- 2. Contar quantos perfis têm cada valor
SELECT 
    button_content_align,
    COUNT(*) as quantidade
FROM user_profiles
GROUP BY button_content_align
ORDER BY quantidade DESC;

-- 3. Verificar se há algum problema com valores
SELECT 
    user_id,
    button_content_align,
    CASE 
        WHEN button_content_align IS NULL THEN 'NULL'
        WHEN button_content_align NOT IN ('left', 'center', 'right') THEN 'VALOR INVÁLIDO: ' || button_content_align
        ELSE 'OK'
    END as status
FROM user_profiles
WHERE button_content_align IS NULL 
   OR button_content_align NOT IN ('left', 'center', 'right');

