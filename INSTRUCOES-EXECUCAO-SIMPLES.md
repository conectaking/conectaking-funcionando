# 🚀 Instruções Simples para Executar a Migration

## ⚠️ Problema: Painel Vazio

O painel está vazio porque você precisa executar a **migration principal** primeiro, não apenas as queries de verificação.

## ✅ Solução em 2 Passos

### PASSO 1: Executar Migration Principal

1. **Abra o arquivo** `MIGRATION-SALES-PAGES-SIMPLES.sql` no dBeaver
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Execute** (Ctrl+Enter)
4. **Se aparecer erro** nos ENUMs dizendo "já existe", **ignore** e continue
5. **Se aparecer erro** no `ALTER TYPE` dizendo "cannot be executed inside a transaction block":
   - Abra uma **NOVA aba SQL** no dBeaver
   - Abra o arquivo `EXECUTAR-ALTER-TYPE-SEPARADO.sql`
   - Execute apenas esse comando
   - Volte para a migration principal e continue

### PASSO 2: Verificar se Funcionou

Execute esta query simples:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events');
```

**Resultado esperado:** 3 linhas aparecendo no painel de resultados

## 🔍 Verificação Visual no Navegador

1. No painel esquerdo, expanda: `conecta_king_db` → `Bancos de dados` → `conecta_king_db`
2. Expanda: `Esquemas` → `public` → `Tabelas`
3. Você deve ver as 3 novas tabelas:
   - `sales_pages`
   - `sales_page_products`
   - `sales_page_events`

## ❌ Se Ainda Não Funcionar

1. **Verifique a aba "Log"** (parte inferior do dBeaver)
2. **Procure por erros** em vermelho
3. **Copie a mensagem de erro completa** e me envie

## 💡 Dica

- Execute a migration **COMPLETA** primeiro
- **Depois** execute as queries de verificação
- O painel vazio significa que as tabelas ainda não existem

