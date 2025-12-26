# 🗄️ Executar Migrations de Tabs no DBeaver

## 📋 Instruções Passo a Passo

### 1. Abrir DBeaver e Conectar ao Banco de Dados
- Abra o DBeaver
- Conecte-se ao banco de dados PostgreSQL do projeto Conecta King

### 2. Executar a Primeira Migration (Criar Tabela profile_tabs)

**Arquivo:** `migrations/012_create_profile_tabs_table.sql`

1. No DBeaver, vá em **SQL Editor** (ou pressione `Ctrl+]`)
2. Abra o arquivo `migrations/012_create_profile_tabs_table.sql`
3. **OU** copie e cole o seguinte SQL:

```sql
-- ===========================================
-- Migration: Criar tabela profile_tabs
-- Data: 2025-01-31
-- Descrição: Tabela para armazenar abas (tabs) do perfil público
-- ===========================================

CREATE TABLE IF NOT EXISTS profile_tabs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tab_name VARCHAR(100) NOT NULL,
    tab_icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    content_type VARCHAR(50) DEFAULT 'modules',
    content_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_profile_tabs_user_id ON profile_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_display_order ON profile_tabs(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_profile_tabs_is_active ON profile_tabs(user_id, is_active) WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE profile_tabs IS 'Armazena as abas (tabs) do perfil público dos usuários';
COMMENT ON COLUMN profile_tabs.user_id IS 'ID do usuário proprietário da aba';
COMMENT ON COLUMN profile_tabs.tab_name IS 'Nome da aba exibido no cartão público';
COMMENT ON COLUMN profile_tabs.tab_icon IS 'Ícone FontAwesome para a aba (opcional)';
COMMENT ON COLUMN profile_tabs.display_order IS 'Ordem de exibição das abas';
COMMENT ON COLUMN profile_tabs.is_active IS 'Se a aba está ativa e deve ser exibida';
COMMENT ON COLUMN profile_tabs.content_type IS 'Tipo de conteúdo: modules, text, html, portfolio, about';
COMMENT ON COLUMN profile_tabs.content_data IS 'Dados do conteúdo da aba (texto, HTML, JSON, etc.)';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_profile_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_tabs_updated_at
    BEFORE UPDATE ON profile_tabs
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_tabs_updated_at();
```

4. Clique em **Execute SQL Script** (ou pressione `Ctrl+Enter`)
5. Verifique se apareceu a mensagem de sucesso

### 3. Executar a Segunda Migration (Adicionar tab_id em profile_items)

**Arquivo:** `migrations/013_add_tab_id_to_profile_items.sql`

1. No mesmo SQL Editor (ou abra um novo)
2. Abra o arquivo `migrations/013_add_tab_id_to_profile_items.sql`
3. **OU** copie e cole o seguinte SQL:

```sql
-- ===========================================
-- Migration: Adicionar tab_id à tabela profile_items
-- Data: 2025-01-31
-- Descrição: Permite associar módulos a abas específicas
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profile_items'
        AND column_name = 'tab_id'
    ) THEN
        ALTER TABLE profile_items
        ADD COLUMN tab_id INTEGER REFERENCES profile_tabs(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_profile_items_tab_id ON profile_items(tab_id);
        
        RAISE NOTICE 'Coluna tab_id adicionada com sucesso à tabela profile_items';
    ELSE
        RAISE NOTICE 'Coluna tab_id já existe na tabela profile_items';
    END IF;
END $$;
```

4. Clique em **Execute SQL Script** (ou pressione `Ctrl+Enter`)
5. Verifique se apareceu a mensagem de sucesso

### 4. Verificar se as Migrations Foram Executadas

Execute estas queries para verificar:

```sql
-- Verificar se a tabela profile_tabs foi criada
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profile_tabs'
ORDER BY ordinal_position;

-- Verificar se a coluna tab_id foi adicionada em profile_items
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profile_items'
AND column_name = 'tab_id';
```

### 5. ✅ Pronto!

Após executar as migrations:
- A tabela `profile_tabs` estará criada
- A coluna `tab_id` estará adicionada em `profile_items`
- O sistema de tabs estará funcionando no backend
- Você poderá criar e gerenciar tabs pelo dashboard

## ⚠️ Observações Importantes

- Execute as migrations **na ordem**: primeiro `012_create_profile_tabs_table.sql`, depois `013_add_tab_id_to_profile_items.sql`
- As migrations são **idempotentes** (podem ser executadas múltiplas vezes sem problemas)
- Se alguma migration falhar, verifique os logs de erro no DBeaver

## 🔍 Troubleshooting

**Erro: "relation already exists"**
- A tabela já existe, pode ignorar ou usar `DROP TABLE IF EXISTS profile_tabs CASCADE;` antes

**Erro: "column already exists"**
- A coluna já existe, a migration detecta isso automaticamente

**Erro de permissão**
- Certifique-se de estar conectado com um usuário que tem permissões de DDL (CREATE, ALTER)

