-- Migration Simplificada: Avatar Format
-- Execute este script se o script completo não funcionar
-- Execute cada parte separadamente

-- ============================================
-- PARTE 1: Verificar se coluna já existe
-- ============================================
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'avatar_format'
) AS coluna_existe;

-- ============================================
-- PARTE 2: Criar a coluna (execute apenas se Parte 1 retornar false)
-- ============================================
-- Descomente e execute apenas se a coluna não existir:
/*
ALTER TABLE user_profiles 
ADD COLUMN avatar_format VARCHAR(50) DEFAULT 'circular' 
CHECK (avatar_format IN ('circular', 'square-full', 'square-small'));
*/

-- ============================================
-- PARTE 3: Atualizar registros existentes
-- ============================================
-- Descomente e execute após criar a coluna:
/*
UPDATE user_profiles 
SET avatar_format = 'circular' 
WHERE avatar_format IS NULL;
*/

-- ============================================
-- PARTE 4: Verificar resultado
-- ============================================
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';

