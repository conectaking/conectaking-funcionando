# 📋 Como Executar a Migration no dBeaver - Passo a Passo

## ⚠️ IMPORTANTE: Por que o painel está vazio?

O painel de resultados está vazio porque você está executando apenas a **query de verificação**, mas a **migration principal ainda não foi executada**. 

As queries de verificação só vão mostrar resultados **DEPOIS** que as tabelas e ENUMs forem criados.

## 🎯 Solução: Execute a Migration Principal Primeiro

### Opção 1: Executar Script Completo (Recomendado)

1. **Abra o arquivo** `EXECUTAR-MIGRATION-SALES-PAGES-DBEAVER.sql` no dBeaver
2. **Selecione TODO o conteúdo** do arquivo (Ctrl+A)
3. **Execute o script completo**:
   - Pressione **Ctrl+Enter** (ou Cmd+Enter no Mac)
   - OU clique no botão **"Execute SQL Script"** (▶️) na toolbar
4. **Aguarde** a execução terminar
5. **Verifique a aba "Log"** na parte inferior para ver se houve erros

### Opção 2: Executar Passo a Passo (Se a Opção 1 não funcionar)

1. **Abra o arquivo** `EXECUTAR-MIGRATION-PASSO-A-PASSO.sql`
2. **Execute cada BLOCO separadamente**:
   - Selecione o **BLOCO 1** (criar ENUMs)
   - Pressione **Ctrl+Enter**
   - Aguarde executar
   - Repita para cada bloco seguinte

## ✅ Como Saber se Funcionou?

Após executar a migration, execute esta query de verificação:

```sql
-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales_pages', 'sales_page_products', 'sales_page_events');
```

**Resultado esperado:** Você deve ver 3 linhas:
- `sales_pages`
- `sales_page_products`
- `sales_page_events`

## 🔍 Verificar no Navegador do dBeaver

1. No painel esquerdo "Navegador de banco de dados"
2. Expanda: `conecta_king_db` → `Bancos de dados` → `conecta_king_db`
3. Expanda: `Esquemas` → `public` → `Tabelas`
4. Você deve ver as 3 novas tabelas:
   - `sales_pages`
   - `sales_page_products`
   - `sales_page_events`

## ❌ Se Ainda Estiver Vazio

Se após executar a migration o painel ainda estiver vazio:

1. **Verifique a aba "Log"** (parte inferior do dBeaver)
2. **Procure por erros** (linhas em vermelho)
3. **Copie a mensagem de erro** e me envie

## 📝 Dica Importante

- **Sempre execute a migration PRIMEIRO**
- **Depois** execute as queries de verificação
- O painel vazio significa que as tabelas ainda não existem
