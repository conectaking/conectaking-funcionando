# Como Executar a Migration 015 - Avatar Format

## ⚡ Método Rápido: DBeaver (Recomendado)

### Passo a Passo:

1. **Abra o DBeaver** e conecte-se ao seu banco PostgreSQL

2. **Abra um SQL Editor:**
   - Clique com botão direito no banco → **SQL Editor** → **New SQL Script**
   - Ou pressione `Ctrl+Alt+S`

3. **Abra o arquivo da migration:**
   - **File** → **Open**
   - Navegue até: `migrations/015_add_avatar_format_to_user_profiles.sql`
   - Ou copie e cole o conteúdo abaixo

4. **Execute o script:**
   - Pressione `Ctrl+Enter` ou clique no botão **Execute** (▶️)

5. **Verifique o resultado:**
   - Deve aparecer: "Coluna avatar_format adicionada com sucesso"
   - A query de verificação deve mostrar a coluna criada

---

## 📋 Código SQL Completo (para copiar):

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

## 🔧 Método Alternativo: Script Node.js

Se preferir usar o script automático, você precisa configurar o arquivo `.env` primeiro:

### 1. Criar arquivo `.env` na raiz do projeto:

Crie um arquivo chamado `.env` (sem extensão) na pasta raiz do projeto.

### 2. Adicionar as variáveis obrigatórias:

```env
# Banco de Dados
DB_USER=seu_usuario_postgres
DB_HOST=localhost
DB_DATABASE=nome_do_banco
DB_PASSWORD=sua_senha_postgres
DB_PORT=5432

# JWT Secret (obrigatório)
JWT_SECRET=seu_jwt_secret_aqui_gerar_um_token_seguro
```

**⚠️ IMPORTANTE:** Substitua os valores acima pelas suas credenciais reais do banco de dados.

### 3. Executar a migration:

```bash
npm run migrate
```

---

## ✅ Verificação Pós-Execução

Para confirmar que funcionou, execute esta query no DBeaver:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'avatar_format';
```

**Resultado esperado:**
- `column_name`: `avatar_format`
- `data_type`: `character varying` ou `varchar`
- `column_default`: `'circular'::character varying`

---

## 🎯 Após Executar com Sucesso

1. ✅ A coluna `avatar_format` será criada na tabela `user_profiles`
2. ✅ Todos os perfis existentes terão `avatar_format = 'circular'` por padrão
3. ✅ O dashboard permitirá selecionar o formato do avatar
4. ✅ O cartão público exibirá o avatar no formato escolhido

---

## 💡 Dica

A migration é **idempotente** - pode executar várias vezes sem problemas. Se a coluna já existir, ela será ignorada.

