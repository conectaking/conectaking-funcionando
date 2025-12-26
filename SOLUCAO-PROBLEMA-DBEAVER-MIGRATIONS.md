# 🔧 Solução: Problema ao Executar Migrations no DBeaver

## 🔍 Diagnóstico do Problema

Se o DBeaver não está executando migrations, pode ser:

1. **Problema de permissões** do usuário no banco
2. **Modo de execução incorreto** no DBeaver
3. **Script não está sendo executado completamente**
4. **Transações não estão sendo commitadas**

---

## ✅ SOLUÇÃO PASSO A PASSO

### **PASSO 1: Testar Conexão com Script Simples**

1. **Abra um novo SQL Editor** no DBeaver
2. **Execute este teste simples primeiro:**

```sql
-- Teste 1: Verificar se consegue ler dados
SELECT 'Teste de conexão funcionando!' AS mensagem;

-- Teste 2: Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
) AS tabela_existe;
```

3. **Execute com `Ctrl+Enter`**
4. **Verifique se retorna resultados**

**Se funcionar:** Continue para o Passo 2
**Se não funcionar:** Problema de conexão ou permissões

---

### **PASSO 2: Verificar Permissões do Usuário**

Execute esta query para verificar suas permissões:

```sql
-- Verificar permissões do usuário atual
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = current_user 
AND table_name = 'user_profiles';
```

**Você precisa ter pelo menos:**
- `SELECT` (para ler)
- `ALTER` (para modificar tabela)
- `UPDATE` (para atualizar dados)

---

### **PASSO 3: Executar Migration em Partes**

Em vez de executar tudo de uma vez, execute em partes:

#### **Parte 1: Verificar se coluna já existe**

```sql
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'avatar_format'
) AS coluna_existe;
```

#### **Parte 2: Criar a coluna (execute apenas se Parte 1 retornar `false`)**

```sql
ALTER TABLE user_profiles 
ADD COLUMN avatar_format VARCHAR(50) DEFAULT 'circular' 
CHECK (avatar_format IN ('circular', 'square-full', 'square-small'));
```

#### **Parte 3: Atualizar registros existentes**

```sql
UPDATE user_profiles 
SET avatar_format = 'circular' 
WHERE avatar_format IS NULL;
```

#### **Parte 4: Verificar resultado**

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
```

---

### **PASSO 4: Configurar DBeaver para Auto-Commit**

O problema pode ser que o DBeaver não está fazendo commit automático:

1. **No DBeaver, vá em:**
   - **Window** → **Preferences** (ou `Ctrl+3`)
   - **Connections** → **Transactions**

2. **Configure:**
   - Marque **"Auto-commit by default"**
   - OU desmarque e faça commit manual após executar

3. **OU faça commit manual:**
   - Após executar o SQL, clique no botão **"Commit"** (✓) na barra de ferramentas
   - Ou use `Ctrl+Shift+Enter`

---

### **PASSO 5: Executar com Transação Explícita**

Se ainda não funcionar, execute assim:

```sql
BEGIN;

-- Verificar se coluna existe
DO $$ 
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
END $$;

COMMIT;

-- Verificação
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
```

**Após executar, clique em "Commit" manualmente.**

---

## 🚨 ALTERNATIVA: Executar Diretamente no Render

Se o DBeaver continuar com problemas, execute diretamente no Render:

### **Opção A: Via Render Dashboard**

1. Acesse: https://dashboard.render.com
2. Vá no banco PostgreSQL `conecta_king_db`
3. Procure por **"Shell"**, **"Console"** ou **"SQL Editor"**
4. Execute o SQL diretamente lá

### **Opção B: Via psql (Terminal)**

Se você tem psql instalado localmente:

```bash
psql -h virginia-postgres.render.com -U conecta_king_db_user -d conecta_king_db -p 5432
```

Quando pedir senha, digite: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`

Depois execute:

```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_format VARCHAR(50) DEFAULT 'circular' 
CHECK (avatar_format IN ('circular', 'square-full', 'square-small'));

UPDATE user_profiles 
SET avatar_format = 'circular' 
WHERE avatar_format IS NULL;
```

---

## 🔍 Verificar se Funcionou

Execute esta query para confirmar:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
```

**Deve retornar:**
- `column_name`: `avatar_format`
- `data_type`: `character varying`
- `column_default`: `'circular'::character varying`

---

## 💡 Dicas Importantes

1. **Sempre faça Commit:** Após executar ALTER TABLE, clique em "Commit"
2. **Verifique Logs:** Olhe o painel "Log" no DBeaver para ver mensagens de erro
3. **Execute em partes:** Se o script completo não funcionar, execute parte por parte
4. **Use IF NOT EXISTS:** A migration já tem proteção, mas pode tentar com `ADD COLUMN IF NOT EXISTS`

---

## 📞 Próximos Passos

1. **Primeiro:** Execute o arquivo `TESTE-SIMPLES-DBEAVER.sql` para diagnosticar
2. **Depois:** Tente executar a migration em partes (Passo 3)
3. **Se não funcionar:** Use o Render Dashboard ou psql diretamente

Me avise qual passo funcionou ou se encontrou algum erro específico!

