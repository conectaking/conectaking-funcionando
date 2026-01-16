# 🔍 Diagnóstico: Tabela unique_form_links não encontrada

## Problema
O sistema está retornando erro: "Tabela de links únicos não encontrada. Execute a migration 084 primeiro."

## Passos para Diagnóstico

### 1. Verificar se a migration foi executada corretamente

Execute o script de diagnóstico:
```bash
psql -U seu_usuario -d seu_banco -f migrations/086_verify_unique_form_links_table.sql
```

Ou execute diretamente no seu cliente PostgreSQL:
```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'unique_form_links';

-- Se retornar vazio, a tabela NÃO existe
```

### 2. Verificar qual banco de dados está sendo usado

No arquivo `.env`, verifique:
```
DB_DATABASE=nome_do_seu_banco
```

**IMPORTANTE:** A migration deve ser executada no MESMO banco de dados que a aplicação está usando!

### 3. Verificar se a migration foi executada no banco correto

Se você executou a migration em um banco e a aplicação está conectada a outro, isso causará o erro.

### 4. Executar as migrations na ordem correta

Se a tabela não existe:
```bash
# 1. Executar migration 084 (criar tabela)
psql -U seu_usuario -d seu_banco -f migrations/084_create_unique_form_links.sql

# 2. Executar migration 085 (corrigir tipo de created_by_user_id)
psql -U seu_usuario -d seu_banco -f migrations/085_fix_unique_form_links_created_by_user_id.sql

# 3. Verificar com diagnóstico
psql -U seu_usuario -d seu_banco -f migrations/086_verify_unique_form_links_table.sql
```

### 5. Verificar logs do servidor

Após executar as migrations, verifique os logs do servidor:
- Procurar por: `✅ [UNIQUE_LINKS] Tabela unique_form_links existe e é acessível`
- Se aparecer: `❌ [UNIQUE_LINKS] Tabela unique_form_links NÃO existe` → a tabela ainda não foi criada

### 6. Reiniciar o servidor

**CRÍTICO:** Após executar qualquer migration, sempre reinicie o servidor Node.js!

## Solução Rápida

1. Conecte-se ao seu banco de dados PostgreSQL
2. Execute o conteúdo do arquivo `migrations/084_create_unique_form_links.sql`
3. Execute o conteúdo do arquivo `migrations/085_fix_unique_form_links_created_by_user_id.sql` (se necessário)
4. Reinicie o servidor Node.js
5. Teste novamente

## Verificação Final

Para confirmar que está funcionando:
```sql
-- Deve retornar a estrutura da tabela
\d unique_form_links

-- Ou via SQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'unique_form_links';
```

Se `created_by_user_id` mostrar `character varying` (ou `varchar`), está correto!
Se mostrar `integer`, execute a migration 085.
