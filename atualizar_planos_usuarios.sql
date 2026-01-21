-- Script SQL para atualizar account_type dos usuários existentes
-- Mapeia planos antigos para os novos planos
-- Execute este script diretamente no banco de dados PostgreSQL

-- Atualizar usuários com account_type 'individual' para 'basic' (King Start)
UPDATE users
SET account_type = 'basic'
WHERE account_type = 'individual';

-- Atualizar usuários com account_type 'individual_com_logo' para 'premium' (King Prime)
UPDATE users
SET account_type = 'premium'
WHERE account_type = 'individual_com_logo';

-- Atualizar usuários com account_type 'business_owner' para 'king_corporate' (King Corporate)
UPDATE users
SET account_type = 'king_corporate'
WHERE account_type = 'business_owner';

-- Verificar o resultado
SELECT 
    account_type,
    COUNT(*) as total_usuarios
FROM users
GROUP BY account_type
ORDER BY account_type;
