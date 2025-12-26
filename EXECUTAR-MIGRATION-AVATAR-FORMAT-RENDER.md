# 🚀 Como Executar a Migration 015 - Avatar Format

## ⚡ OPÇÃO 1: Executar Diretamente no Render Dashboard (MAIS FÁCIL)

### Passo a Passo:

1. **Acesse o Render Dashboard:**
   - Vá para: https://dashboard.render.com
   - Faça login na sua conta

2. **Encontre o Banco PostgreSQL:**
   - No menu lateral, procure por **"PostgreSQL"** ou **"Databases"**
   - Clique no banco `conecta_king_db` (ou o nome do seu banco)

3. **Acesse o Shell/Console:**
   - Procure por **"Shell"**, **"Console"** ou **"Connect"** no menu do banco
   - Alguns planos têm **"SQL Editor"** ou **"Query Tool"** diretamente no dashboard

4. **Execute o SQL:**
   - Copie e cole o código SQL completo abaixo
   - Execute o script

5. **Verifique o resultado:**
   - Deve aparecer uma mensagem de sucesso
   - Execute a query de verificação para confirmar

---

## 🛠️ OPÇÃO 2: Reconfigurar DBeaver

### Passo 1: Verificar/Criar Nova Conexão

1. **Abra o DBeaver**

2. **Criar Nova Conexão (se necessário):**
   - Clique no botão **"Nova Conexão"** (ícone de plug) ou `Ctrl+Shift+N`
   - Selecione **"PostgreSQL"**
   - Clique em **"Próximo"**

3. **Configurar Conexão:**
   
   **Aba "Principal":**
   - **Host:** `virginia-postgres.render.com`
   - **Port:** `5432`
   - **Database:** `conecta_king_db`
   - **Username:** `conecta_king_db_user`
   - **Password:** `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
   
   **Aba "SSL":**
   - Marque **"Use SSL"**
   - SSL Mode: **"require"** ou **"prefer"**

4. **Testar Conexão:**
   - Clique em **"Testar Conexão"**
   - Se pedir para baixar drivers, clique em **"Baixar"**
   - Aguarde e teste novamente
   - Se conectar com sucesso, clique em **"Finalizar"**

### Passo 2: Executar a Migration

1. **Abrir SQL Editor:**
   - Clique com botão direito na conexão `conecta_king_db`
   - Selecione **"SQL Editor"** → **"Novo Editor SQL"**
   - Ou use `Ctrl+Alt+S`

2. **Abrir o Arquivo da Migration:**
   - **File** → **Open**
   - Navegue até: `migrations/015_add_avatar_format_to_user_profiles.sql`
   - Ou copie e cole o código SQL abaixo

3. **Executar o Script:**
   - **Selecione TODO o código** (`Ctrl+A`)
   - Pressione **`Ctrl+Enter`** (executa query selecionada)
   - OU clique no botão **"Execute SQL Script"** (▶️) na barra de ferramentas
   - OU use **`Ctrl+Alt+X`**

4. **Verificar Resultado:**
   - No painel de **"Log"** ou **"Output"**, deve aparecer:
     - `NOTICE: Coluna avatar_format adicionada com sucesso à tabela user_profiles`
     - OU: `NOTICE: Coluna avatar_format já existe na tabela user_profiles`
   - No painel de **"Resultados"**, a query de verificação deve mostrar a coluna criada

### Passo 3: Atualizar Estrutura do Banco no DBeaver

Para ver a coluna na interface:

1. **No Navegador de Banco de Dados:**
   - Expanda: `conecta_king_db` → **"Schemas"** → **"public"** → **"Tables"**
   - Encontre a tabela **`user_profiles`**
   - Clique com botão direito → **"Refresh"** (`F5`)
   - OU: **"View Table"**

2. **Verificar Coluna:**
   - Expanda `user_profiles` → **"Columns"**
   - Procure por **`avatar_format`**
   - Deve aparecer com:
     - Type: `character varying(50)`
     - Default: `'circular'::character varying`
     - Not null: `false`

---

## 📋 Código SQL Completo (Copiar e Colar)

```sql
-- Migration: Adicionar coluna avatar_format à tabela user_profiles
-- Data: 2025-01-31
-- Descrição: Adiciona campo para controlar o formato do avatar (circular, square-full, square-small)

-- Verificar se a coluna já existe antes de adicionar
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
        
        -- Atualizar registros existentes para usar 'circular' como padrão
        UPDATE user_profiles 
        SET avatar_format = 'circular' 
        WHERE avatar_format IS NULL;
        
        RAISE NOTICE 'Coluna avatar_format adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna avatar_format já existe na tabela user_profiles';
    END IF;
END $$;

-- Verificação
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
```

---

## ✅ Verificação Pós-Execução

Execute esta query para confirmar que funcionou:

```sql
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
```

**Resultado esperado:**
- `column_name`: `avatar_format`
- `data_type`: `character varying` ou `varchar`
- `column_default`: `'circular'::character varying`
- `is_nullable`: `YES`

---

## 🔧 Solução de Problemas no DBeaver

### Problema: "Connection refused" ou "Timeout"

**Solução:**
1. Verifique se o SSL está habilitado (aba SSL)
2. Tente mudar o SSL Mode para **"prefer"** ou **"require"**
3. Verifique sua conexão com internet
4. Tente desconectar e reconectar

### Problema: "Authentication failed"

**Solução:**
1. Verifique se copiou a senha corretamente: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
2. Verifique o username: `conecta_king_db_user`
3. Tente criar uma nova conexão do zero

### Problema: Script não executa

**Solução:**
1. Certifique-se de que selecionou TODO o código (`Ctrl+A`)
2. Use `Ctrl+Enter` para executar a query selecionada
3. OU use `Ctrl+Alt+X` para executar o script completo
4. Verifique se está conectado ao banco correto (`conecta_king_db`)

### Problema: Não vejo a coluna após executar

**Solução:**
1. Faça refresh na tabela: Clique direito em `user_profiles` → **Refresh** (`F5`)
2. Execute a query de verificação manualmente
3. Verifique se executou no banco correto (não em outro banco)

---

## 🎯 Após Executar com Sucesso

1. ✅ A coluna `avatar_format` será criada na tabela `user_profiles`
2. ✅ Todos os perfis existentes terão `avatar_format = 'circular'` por padrão
3. ✅ O dashboard permitirá selecionar o formato do avatar
4. ✅ O cartão público exibirá o avatar no formato escolhido

---

## 💡 Dica Importante

A migration é **idempotente** - pode executar várias vezes sem problemas. Se a coluna já existir, ela será ignorada.

---

## 📞 Precisa de Ajuda?

Se nenhuma das opções funcionar:
1. Verifique se as credenciais do banco estão corretas
2. Verifique se o banco PostgreSQL está ativo no Render
3. Tente executar apenas a parte do `DO $$ ... END $$;` primeiro
4. Depois execute a query de verificação separadamente

