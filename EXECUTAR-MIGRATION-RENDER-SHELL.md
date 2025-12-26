# 🚀 Executar Migration via Render Shell

## Método: Usar o Shell do Render

### Passo 1: Acessar o Shell

1. **Acesse o Render Dashboard:**
   - https://dashboard.render.com
   - Faça login

2. **Encontre o Serviço da API:**
   - Procure pelo serviço `conectaking-api` (ou o nome do seu serviço backend)
   - Clique nele

3. **Abra o Shell:**
   - No menu lateral, procure por **"Shell"** ou **"Console"**
   - Clique para abrir o terminal interativo

### Passo 2: Executar a Migration

No shell do Render, execute:

```bash
# Opção 1: Executar todas as migrations
npm run migrate

# Opção 2: Executar apenas a migration específica via psql
psql $DATABASE_URL -f migrations/015_add_avatar_format_to_user_profiles.sql

# Opção 3: Executar SQL diretamente
psql $DATABASE_URL -c "
DO \$\$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'avatar_format'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN avatar_format VARCHAR(50) DEFAULT 'circular' 
        CHECK (avatar_format IN ('circular', 'square-full', 'square-small'));
        
        UPDATE user_profiles 
        SET avatar_format = 'circular' 
        WHERE avatar_format IS NULL;
        
        RAISE NOTICE 'Coluna avatar_format adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna avatar_format já existe';
    END IF;
END \$\$;
"
```

### Passo 3: Verificar

```bash
psql $DATABASE_URL -c "
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
"
```

---

## Método Alternativo: Via psql Direto

Se você tem acesso ao terminal local com psql instalado:

```bash
psql -h virginia-postgres.render.com \
     -U conecta_king_db_user \
     -d conecta_king_db \
     -p 5432 \
     -f migrations/015_add_avatar_format_to_user_profiles.sql
```

Quando pedir a senha, digite: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`

