# ✅ Instalar Driver PostgreSQL no SQLTools

## 🎯 Você está quase lá!

Vejo que o SQLTools está instalado, mas precisa instalar o **driver PostgreSQL**.

### Passo 1: Instalar o Driver

1. **Na tela que está aberta**, clique no link **"Search VS Code Marketplace"**
   - OU vá em Extensions e procure: `SQLTools PostgreSQL`
   
2. **Instale a extensão:**
   - **Nome:** "SQLTools PostgreSQL/Cockroach Driver"
   - **Autor:** mtxr
   - **Ícone:** Azul com folha verde
   - Clique em **"Instalar"**

3. **Aguarde a instalação** (pode levar alguns segundos)

4. **Recarregue o VS Code:**
   - Pressione `Ctrl+Shift+P`
   - Digite: `Developer: Reload Window`
   - Pressione Enter

### Passo 2: Verificar Instalação

1. Pressione `Ctrl+Shift+P`
2. Digite: `SQLTools: Open Settings`
3. Deve aparecer o driver PostgreSQL na lista

### Passo 3: Conectar ao Banco

1. Pressione `Ctrl+Shift+P`
2. Digite: `SQLTools: Add New Connection`
3. Escolha: **PostgreSQL**
4. Preencha:
   ```
   Connection name: conecta_king_db
   Server: virginia-postgres.render.com
   Port: 5432
   Database: conecta_king_db
   Username: [seu usuário]
   Password: [sua senha]
   ```
5. Clique em **"Test Connection"**
6. Se funcionar, clique em **"Save Connection"**

### Passo 4: Executar Migration

1. Abra o arquivo: `MIGRATION-COMANDOS-SEGUROS.sql`
2. Conecte ao banco:
   - Clique no ícone do SQLTools na barra lateral (ícone de banco de dados)
   - Clique com botão direito na conexão → **"Connect"**
3. Execute cada comando:
   - Selecione o **COMANDO 1**
   - Pressione `Ctrl+Shift+E`
   - Repita para cada comando (1 até 15)

## 💡 Dica Rápida:

Se não aparecer o link "Search VS Code Marketplace", vá direto em:
- **Extensions** (ícone de quadrados na barra lateral)
- Procure: `SQLTools PostgreSQL`
- Instale a extensão com ícone azul e folha verde

