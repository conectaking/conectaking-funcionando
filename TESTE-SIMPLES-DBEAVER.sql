-- TESTE SIMPLES: Verificar se o DBeaver está executando SQL corretamente
-- Execute este script primeiro para testar

-- 1. Teste básico: Verificar se consegue ler dados
SELECT 'Teste de conexão funcionando!' AS mensagem;

-- 2. Verificar se a tabela user_profiles existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
) AS tabela_existe;

-- 3. Verificar colunas atuais da tabela user_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 4. Verificar se avatar_format já existe
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'avatar_format'
) AS coluna_avatar_format_existe;

