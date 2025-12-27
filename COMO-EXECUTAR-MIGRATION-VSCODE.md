# ✅ Como Executar Migration no VS Code

## 📦 Passo 1: Instalar Extensões

1. **Instale o SQLTools:**
   - Na busca de extensões, procure por: `SQLTools`
   - Instale a extensão **"SQLTools"** (por mtxr)
   - Tem ícone amarelo com cilindro

2. **Instale o Driver PostgreSQL:**
   - Procure por: `SQLTools PostgreSQL`
   - Instale a extensão **"SQLTools PostgreSQL/Cockroach Driver"** (por mtxr)
   - Tem ícone azul com folha verde

3. **Reinicie o VS Code** (opcional, mas recomendado)

## 🔌 Passo 2: Conectar ao Banco

1. **Abra o Command Palette:**
   - Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac)

2. **Digite:** `SQLTools: Add New Connection`

3. **Preencha os dados:**
   - **Connection name:** `conecta_king_db` (ou qualquer nome)
   - **Server:** `virginia-postgres.render.com` (ou o host do seu banco)
   - **Port:** `5432` (ou a porta do seu banco)
   - **Database:** `conecta_king_db` (nome do banco)
   - **Username:** (seu usuário)
   - **Password:** (sua senha)
   - **Connection Type:** `PostgreSQL`

4. **Clique em "Test Connection"** para verificar
5. **Salve a conexão**

## 🚀 Passo 3: Executar Migration

1. **Abra o arquivo:** `MIGRATION-COMANDOS-SEGUROS.sql`

2. **Conecte ao banco:**
   - Clique no ícone do SQLTools na barra lateral (ícone de banco de dados)
   - Clique com botão direito na conexão `conecta_king_db`
   - Selecione **"Connect"**

3. **Execute os comandos:**
   - Selecione o **COMANDO 1** (todo o bloco `DO $$ ... END $$;`)
   - Pressione `Ctrl+Shift+E` (ou clique com botão direito → "Run Selected Query")
   - Repita para cada comando (1 até 15)

4. **Verifique o resultado:**
   - Execute o **COMANDO 15** (verificação final)
   - Deve mostrar 3 tabelas no painel de resultados

## 💡 Dicas:

- ✅ Use `Ctrl+Shift+E` para executar query selecionada
- ✅ Use `Ctrl+Shift+P` → `SQLTools: Execute Query` para executar tudo
- ✅ Os resultados aparecem em um painel na parte inferior
- ✅ Erros aparecem em vermelho no painel de resultados

## 🎯 Atalhos Úteis:

- `Ctrl+Shift+P` → Command Palette
- `Ctrl+Shift+E` → Executar query selecionada
- `Ctrl+K Ctrl+S` → Ver todos os atalhos

