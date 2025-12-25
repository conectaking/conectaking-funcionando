# Instruções para Executar Migrations do Catálogo de Produtos

## ⚠️ IMPORTANTE: Ordem de Execução

Execute as migrations na ordem abaixo:

## 1. Migration 009: Adicionar `product_catalog` ao ENUM

**Arquivo:** `conecta-king-backend/migrations/009_add_product_catalog_to_enum.sql`

### Via DBeaver:

1. Abra o DBeaver e conecte-se ao seu banco de dados
2. Abra uma nova janela SQL (Ctrl+` ou clique em "New SQL Script")
3. **Execute APENAS este comando** (um por vez, sem transação):

```sql
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'product_catalog';
```

4. Clique em "Execute" (ou pressione Ctrl+Enter)

**Nota:** No PostgreSQL, `ALTER TYPE ADD VALUE` não pode ser executado dentro de uma transação. Execute diretamente, sem BEGIN/COMMIT.

### Verificação (opcional):

Para confirmar que foi adicionado, execute:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
ORDER BY enumsortorder;
```

Você deve ver `product_catalog` na lista.

---

## 2. Migration 010: Criar Tabela `product_catalog_items`

**Arquivo:** `conecta-king-backend/migrations/010_create_product_catalog_items_table.sql`

### Via DBeaver:

1. Abra uma nova janela SQL ou use a mesma
2. Copie e cole TODO o conteúdo do arquivo `010_create_product_catalog_items_table.sql`
3. Execute (Ctrl+Enter)

### O que esta migration faz:

- Cria a tabela `product_catalog_items`
- Cria índices para performance
- Cria trigger para atualizar `updated_at` automaticamente
- Adiciona comentários descritivos

---

## 3. Verificação Final

Execute estas queries para verificar se tudo está correto:

```sql
-- Verificar se o ENUM foi adicionado
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
AND enumlabel = 'product_catalog';

-- Verificar se a tabela foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'product_catalog_items';

-- Verificar estrutura da tabela
\d product_catalog_items
```

Se todas as queries retornarem resultados positivos, as migrations foram executadas com sucesso!

---

## ⚠️ Problemas Comuns

### Erro: "type item_type_enum already exists"
- Significa que o valor já existe. Pode ignorar ou usar `IF NOT EXISTS` (que já está no script).

### Erro: "relation product_catalog_items already exists"
- A tabela já existe. Se quiser recriar, execute:
```sql
DROP TABLE IF EXISTS product_catalog_items CASCADE;
```
E então execute novamente a migration 010.

### Erro ao executar ALTER TYPE dentro de transação
- No DBeaver, certifique-se de que está executando diretamente, sem BEGIN/COMMIT.
- Se estiver usando auto-commit, desative temporariamente para o comando ALTER TYPE.

---

## Próximos Passos

Após executar as migrations:

1. ✅ Verificar se não há erros nas queries
2. ✅ Reiniciar o servidor backend (se estiver rodando)
3. ✅ Testar criar um novo catálogo de produtos no dashboard
4. ✅ Adicionar produtos ao catálogo
5. ✅ Visualizar na página pública

---

## Suporte

Se encontrar algum problema, verifique:
- Logs do servidor backend
- Console do navegador (F12)
- Mensagens de erro no DBeaver

