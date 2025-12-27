# ✅ Instruções - Migration com Comandos Seguros

## 🎯 Este script IGNORA erros de "já existe"

### Como executar:

1. **Abra o arquivo `MIGRATION-COMANDOS-SEGUROS.sql` no dBeaver**

2. **Execute cada comando separadamente:**
   - Selecione apenas o **COMANDO 1** (todo o bloco `DO $$ ... END $$;`)
   - Pressione **Ctrl+Enter** (ou clique em Executar)
   - **Se der erro "já existe", IGNORE e continue** (mas com este script não deve dar erro)
   - Repita para cada comando (1 até 15)

3. **Importante:**
   - ✅ Execute os comandos na ordem (1, 2, 3, 4...)
   - ✅ Se algum comando der erro, leia a mensagem mas continue
   - ✅ O COMANDO 15 é a verificação final - deve mostrar 3 tabelas

### O que este script faz diferente:

- ✅ Usa `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` para ENUMs
- ✅ Usa `CREATE TABLE IF NOT EXISTS` para tabelas
- ✅ Usa `CREATE INDEX IF NOT EXISTS` para índices
- ✅ Usa `DROP TRIGGER IF EXISTS` antes de criar triggers
- ✅ Verifica se o valor já existe antes de adicionar ao ENUM

### Resultado esperado:

Após executar todos os comandos, o **COMANDO 15** deve mostrar:
```
Tabelas criadas
----------------
sales_page_events
sales_page_products
sales_pages
```

### Se ainda der erro:

1. Leia a mensagem de erro
2. Anote qual comando falhou
3. Continue com os próximos comandos
4. Execute o COMANDO 15 para verificar o que foi criado

