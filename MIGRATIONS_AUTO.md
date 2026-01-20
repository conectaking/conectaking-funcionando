# 🚀 Sistema de Execução Automática de Migrations

## 📋 Visão Geral

O sistema agora executa **automaticamente** todas as migrations pendentes sempre que o servidor é iniciado. Você não precisa mais executar migrations manualmente!

## ✨ Como Funciona

1. **Ao iniciar o servidor** (`npm start`), o sistema:
   - Verifica se existe a tabela `schema_migrations` (cria se não existir)
   - Compara migrations disponíveis com migrations já executadas
   - Executa automaticamente todas as migrations pendentes
   - Registra cada execução na tabela de controle

2. **Criação de nova migration**:
   - Crie o arquivo SQL na pasta `migrations/`
   - Na próxima vez que o servidor iniciar, a migration será executada automaticamente
   - Não precisa executar manualmente!

## 📁 Estrutura

- **`migrations/`** - Pasta com todas as migrations SQL
- **`utils/auto-migrate.js`** - Módulo que gerencia execução automática
- **`schema_migrations`** - Tabela no banco que rastreia migrations executadas

## 🎯 Comandos Disponíveis

### Execução Automática (Recomendado)
```bash
npm start
```
Executa migrations automaticamente antes de iniciar o servidor.

### Executar Migrations Manualmente
```bash
npm run migrate-auto
```
Executa apenas as migrations pendentes sem iniciar o servidor.

### Verificar Status
```bash
npm run migrate-status
```
Mostra quantas migrations foram executadas e quantas estão pendentes.

### Execução Manual (Legado)
```bash
npm run migrate
```
Executa todas as migrations usando o script antigo (ainda funciona).

## 📊 Tabela de Controle

A tabela `schema_migrations` armazena:
- `migration_name` - Nome do arquivo da migration
- `executed_at` - Data/hora da execução
- `execution_time_ms` - Tempo de execução em milissegundos
- `success` - Se foi executada com sucesso
- `error_message` - Mensagem de erro (se houver)

## 🔍 Verificar Migrations Executadas

```sql
SELECT migration_name, executed_at, execution_time_ms, success 
FROM schema_migrations 
ORDER BY executed_at DESC;
```

## ⚠️ Tratamento de Erros

- **Migrations já executadas**: Se uma migration tenta criar algo que já existe, ela é marcada como executada (não causa erro)
- **Erros críticos**: Se uma migration falhar, o erro é registrado mas o servidor continua iniciando
- **Logs detalhados**: Todos os passos são registrados no log do servidor

## 🆕 Criando Nova Migration

1. Crie o arquivo SQL na pasta `migrations/`:
   ```
   migrations/099_minha_nova_migration.sql
   ```

2. Use o padrão `DO $$ BEGIN ... END $$;` para tornar a migration idempotente:
   ```sql
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'minha_tabela') THEN
           CREATE TABLE minha_tabela (...);
       END IF;
   END $$;
   ```

3. Na próxima inicialização do servidor, a migration será executada automaticamente!

## 🔄 Migrations Especiais

- **098_create_migrations_table.sql**: Cria a tabela de controle (executada primeiro automaticamente)
- **097_create_finance_profiles.sql**: Sistema de perfis financeiros múltiplos

## 📝 Notas Importantes

- ✅ Migrations são executadas em ordem alfabética/numerica
- ✅ Cada migration é executada em sua própria transação
- ✅ Se uma migration falhar, as anteriores já executadas não são afetadas
- ✅ O sistema é idempotente - pode executar múltiplas vezes sem problemas
- ✅ Funciona tanto em desenvolvimento quanto em produção

## 🐛 Troubleshooting

### Migration não está sendo executada?
1. Verifique se o arquivo está na pasta `migrations/`
2. Verifique se o nome do arquivo termina com `.sql`
3. Execute `npm run migrate-status` para ver o status
4. Verifique os logs do servidor ao iniciar

### Migration com erro?
1. Verifique a tabela `schema_migrations` para ver a mensagem de erro
2. Corrija o SQL da migration
3. Delete o registro da migration na tabela: `DELETE FROM schema_migrations WHERE migration_name = '099_minha_migration.sql';`
4. Reinicie o servidor para tentar novamente

### Quer executar uma migration novamente?
```sql
DELETE FROM schema_migrations WHERE migration_name = '099_minha_migration.sql';
```
Depois reinicie o servidor.
