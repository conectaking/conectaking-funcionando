# 📋 Como Executar a Migration de Sales Pages no Render

## Opção 1: Via Shell do Render (Recomendado)

1. Acesse o dashboard do Render
2. Vá em **Shell** do seu serviço PostgreSQL
3. Execute o comando:

```bash
psql $DATABASE_URL -f migrations/017_create_sales_pages_module.sql
```

Ou copie e cole o conteúdo do arquivo `EXECUTAR-MIGRATION-SALES-PAGES-DBEAVER.sql` diretamente no shell.

## Opção 2: Via dBeaver (Recomendado para desenvolvimento local)

1. Abra o dBeaver
2. Conecte-se ao banco de dados PostgreSQL
3. Abra o arquivo `EXECUTAR-MIGRATION-SALES-PAGES-DBEAVER.sql`
4. Execute o script completo (Ctrl+Enter ou botão Execute)
5. Verifique se não houve erros na aba "Log"

## Opção 3: Via psql direto

```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f migrations/017_create_sales_pages_module.sql
```

## ✅ Verificação

Após executar, verifique se as tabelas foram criadas:

```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events');

-- Verificar ENUMs
SELECT typname FROM pg_type WHERE typname IN ('sales_page_status', 'product_status', 'event_type');

-- Verificar se sales_page foi adicionado ao item_type_enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
AND enumlabel = 'sales_page';
```

## ⚠️ Observações Importantes

1. **ALTER TYPE ADD VALUE**: No PostgreSQL, este comando não pode ser executado dentro de uma transação. O script usa `DO $$` para contornar isso.

2. **IF NOT EXISTS**: O script usa verificações para evitar erros se executado múltiplas vezes.

3. **Ordem de execução**: Execute o script completo de uma vez para garantir que tudo seja criado na ordem correta.

4. **Backup**: Recomenda-se fazer backup do banco antes de executar migrations em produção.

