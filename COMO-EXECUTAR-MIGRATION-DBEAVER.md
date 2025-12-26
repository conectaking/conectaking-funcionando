# Como Executar a Migration no DBeaver

## Passo a Passo Detalhado

### 1. Abrir o DBeaver

1. Abra o aplicativo **DBeaver** no seu computador
2. Conecte-se ao banco de dados PostgreSQL do Render (ou seu banco de dados)

### 2. Localizar o Banco de Dados

1. No painel esquerdo (Database Navigator), encontre sua conexão PostgreSQL
2. Expanda a conexão até encontrar o banco de dados (geralmente algo como `conectaking_db`)
3. Expanda o banco de dados para ver as tabelas

### 3. Abrir Editor SQL

**Opção 1 - Criar Novo Script SQL:**
1. Clique com o botão direito no banco de dados
2. Selecione **SQL Editor** → **New SQL Script**
3. Ou use o atalho: `Ctrl+Alt+S` (Windows/Linux) ou `Cmd+Option+S` (Mac)

**Opção 2 - Abrir Arquivo SQL:**
1. No menu superior, vá em **File** → **Open**
2. Navegue até a pasta `conectaking-funcionando/migrations/`
3. Selecione o arquivo `011_add_button_content_align_to_user_profiles.sql`

### 4. Copiar e Colar o Código SQL

Se você abriu um novo script, copie e cole o seguinte código:

```sql
-- Migration: Adicionar coluna button_content_align à tabela user_profiles
-- Data: 2025-12-25
-- Descrição: Adiciona campo para controlar o alinhamento do conteúdo dos botões (left, center, right)

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'button_content_align'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN button_content_align VARCHAR(10) DEFAULT 'center' 
        CHECK (button_content_align IN ('left', 'center', 'right'));
        
        -- Atualizar registros existentes para usar 'center' como padrão
        UPDATE user_profiles 
        SET button_content_align = 'center' 
        WHERE button_content_align IS NULL;
        
        RAISE NOTICE 'Coluna button_content_align adicionada com sucesso à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna button_content_align já existe na tabela user_profiles';
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
AND column_name = 'button_content_align';
```

### 5. Executar o Script

**Método 1 - Botão Executar:**
1. Certifique-se de que o script está completo e selecionado
2. Clique no botão **Execute SQL Script** (ícone de play ▶️) na barra de ferramentas
3. Ou pressione `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)

**Método 2 - Executar Seleção:**
1. Selecione todo o código SQL (Ctrl+A)
2. Clique com o botão direito e selecione **Execute** → **Execute SQL Script**
3. Ou use `Ctrl+Alt+X`

### 6. Verificar o Resultado

Após executar, você deve ver:

1. **No painel de resultados (abaixo):**
   - Uma mensagem de sucesso indicando que a coluna foi adicionada
   - OU uma mensagem dizendo que a coluna já existe

2. **Na aba de resultados da query de verificação:**
   - Uma linha mostrando os detalhes da coluna `button_content_align`
   - Data type: `character varying` ou `varchar`
   - Column default: `'center'::character varying`
   - Is nullable: `YES`

### 7. Verificar Visualmente (Opcional)

1. No painel esquerdo, vá em **Database Navigator**
2. Expanda: **Databases** → **seu_banco** → **Schemas** → **public** → **Tables**
3. Encontre a tabela `user_profiles`
4. Clique com botão direito → **View Table**
5. Procure pela coluna `button_content_align` na lista de colunas

### 8. Se Houver Erro

**Erro: "syntax error"**
- Certifique-se de que copiou o código completo
- Verifique se há aspas ou caracteres especiais incorretos

**Erro: "permission denied"**
- Verifique se você tem permissões de ALTER TABLE no banco
- Pode precisar de credenciais de administrador

**Erro: "column already exists"**
- Isso significa que a coluna já existe - não é um problema!
- Pode continuar normalmente

### 9. Após Executar com Sucesso

1. ✅ A migration foi aplicada
2. Volte ao dashboard e **salve novamente** as configurações de alinhamento
3. Recarregue a página do cartão público com **Ctrl+F5** (limpar cache)
4. O alinhamento deve funcionar corretamente agora!

## Dica Extra

Se quiser verificar todos os dados atuais da coluna:
```sql
SELECT user_id, button_content_align 
FROM user_profiles 
WHERE button_content_align IS NOT NULL;
```

---

**Precisa de ajuda?** Se encontrar algum erro, copie a mensagem de erro completa e me envie!

