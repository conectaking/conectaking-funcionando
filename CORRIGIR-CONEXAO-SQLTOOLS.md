# 🔧 CORRIGIR CONEXÃO SQLTOOLS - ERRO ECONNRESET

## ❌ Problema
O erro `read ECONNRESET` acontece porque o Render PostgreSQL **requer SSL** e você está com SSL desabilitado.

## ✅ Solução

### Passo 1: Habilitar SSL
1. Na tela de configuração do SQLTools, encontre o campo **"SSL"**
2. Mude de **"Disabled"** para **"require"** (ou **"prefer"**)
3. Clique em **"SAVE CONNECTION"** para salvar

### Passo 2: Testar Conexão
1. Clique no botão **"TEST CONNECTION"**
2. Se aparecer uma mensagem de sucesso ✅, a conexão está funcionando!
3. Se ainda der erro, tente mudar SSL para **"prefer"** ao invés de **"require"**

### Passo 3: Executar Migration
Depois que a conexão estiver funcionando:

1. **Abra o arquivo:** `MIGRATION-COMANDOS-SEGUROS.sql`
2. **Execute os comandos UM POR VEZ:**
   - Selecione o primeiro comando (linhas 8-12)
   - Pressione `Ctrl+Enter` (ou clique com botão direito → "Execute Query")
   - Aguarde o resultado
   - Repita para cada comando (há 15 comandos no total)

### Passo 4: Verificar
Execute o último comando (linhas 148-152) para verificar se as 3 tabelas foram criadas:
- `sales_pages`
- `sales_page_products`
- `sales_page_events`

---

## 🎯 Resumo Rápido
1. **SSL:** Mude para `require` ou `prefer`
2. **Salve:** Clique em "SAVE CONNECTION"
3. **Teste:** Clique em "TEST CONNECTION"
4. **Execute:** Migration comando por comando

Me avise quando a conexão funcionar! 🚀

