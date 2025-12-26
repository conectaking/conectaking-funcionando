-- Script para verificar e atualizar valores de button_content_align

-- 1. Ver valores atuais nos perfis
SELECT 
    user_id,
    button_content_align,
    display_name
FROM user_profiles
ORDER BY user_id
LIMIT 20;

-- 2. Contar quantos têm NULL
SELECT 
    COUNT(*) as total_perfis,
    COUNT(button_content_align) as com_valor,
    COUNT(*) - COUNT(button_content_align) as com_null
FROM user_profiles;

-- 3. ATUALIZAR registros que estão NULL para 'center' (padrão)
-- Descomente as linhas abaixo para executar a atualização:
/*
UPDATE user_profiles 
SET button_content_align = 'center' 
WHERE button_content_align IS NULL;

-- Verificar após atualização
SELECT COUNT(*) as total_atualizados
FROM user_profiles
WHERE button_content_align = 'center';
*/

