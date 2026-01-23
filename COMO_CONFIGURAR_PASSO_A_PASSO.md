# 🎯 COMO CONFIGURAR - PASSO A PASSO SIMPLES

## 📌 O QUE VOCÊ PRECISA FAZER

Adicionar um campo no banco de dados para personalizar o link da portaria.

---

## 🚀 MÉTODO MAIS FÁCIL: Via Script Node.js

### Passo 1: Abra o Terminal

1. No VS Code, pressione: `Ctrl + '` (aspas simples)
   - OU clique em: **Terminal** → **New Terminal**

### Passo 2: Execute o Script

Digite exatamente isso e pressione Enter:

```bash
node run-migration-074.js
```

### Passo 3: Veja o Resultado

Se aparecer:
- ✅ `Migration 074 executada com sucesso!`
- ✅ `Campo portaria_slug criado com sucesso!`

**PRONTO! Está funcionando!** 🎉

Se aparecer erro, veja a seção "Se Der Erro" abaixo.

---

## 🔧 MÉTODO ALTERNATIVO: Via SQLTools

### Passo 1: Encontre as Informações de Conexão

Você precisa saber:
- **Host** (endereço do servidor)
- **Port** (geralmente 5432)
- **Database** (nome do banco)
- **Username** (usuário)
- **Password** (senha)

**Onde encontrar?**

1. **Se você tem arquivo `.env`** na raiz do projeto:
   - Abra o arquivo `.env`
   - Procure por: `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`

2. **Se você usa Render.com**:
   - Acesse: https://dashboard.render.com
   - Vá em: **Seu Serviço PostgreSQL** → **Settings**
   - Copie a **Internal Database URL**
   - Ela tem o formato: `postgresql://usuario:senha@host:5432/banco`

### Passo 2: Configure no SQLTools

Na tela do SQLTools que você está vendo:

1. **Connection name**: Digite `ConectaKing` (ou qualquer nome)

2. **Server Address**: 
   - Se for local: `localhost`
   - Se for Render: pegue do `.env` ou do painel (exemplo: `dpg-xxxxx-a.oregon-postgres.render.com`)

3. **Port**: `5432` (já está preenchido)

4. **Database**: Nome do banco (exemplo: `conectaking_db`)

5. **Username**: Seu usuário (exemplo: `conectaking_user`)

6. **Password**: 
   - Clique em "Use password" ou "SQLTools Driver Credentials"
   - Digite sua senha

7. **SSL**: 
   - Se for local: `Disabled`
   - Se for Render: `Required` ou `Prefer`

### Passo 3: Salvar e Testar

1. Clique em **"Test Connection"** ou **"Save"**
2. Se aparecer erro, verifique se os dados estão corretos
3. Se funcionar, você verá a conexão salva

### Passo 4: Executar a Migration

1. No VS Code, abra o arquivo:
   ```
   migrations/074_add_portaria_slug_to_guest_list.sql
   ```

2. Selecione TODO o conteúdo do arquivo (Ctrl+A)

3. Clique com botão direito → **"Run Selected Query"**
   - OU pressione: `Ctrl+Shift+E`

4. Aguarde alguns segundos

5. Se aparecer mensagem de sucesso, está pronto!

---

## ❌ SE DER ERRO

### Erro: "Cannot find module"
```bash
# Execute primeiro:
npm install
```

### Erro: "Connection refused" ou "Connection timeout"
- ✅ Verifique se o servidor PostgreSQL está rodando
- ✅ Verifique se o host/endereço está correto
- ✅ Se for Render, verifique se o serviço está ativo

### Erro: "Authentication failed"
- ✅ Verifique usuário e senha
- ✅ Verifique se o usuário tem permissão no banco

### Erro: "Database does not exist"
- ✅ Verifique o nome do banco de dados
- ✅ Liste os bancos disponíveis

### Erro: "Column already exists"
- ✅ **Isso é BOM!** Significa que a migration já foi executada
- ✅ Pode continuar, está tudo certo!

---

## ✅ COMO SABER SE FUNCIONOU?

### Opção 1: Verificar no Terminal

Se você usou o script `node run-migration-074.js`, você verá:
```
✅ Migration 074 executada com sucesso!
✅ Campo portaria_slug criado com sucesso!
```

### Opção 2: Verificar no SQLTools

Execute esta query:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'guest_list_items' 
AND column_name = 'portaria_slug';
```

**Se retornar uma linha**, está funcionando! ✅

### Opção 3: Testar no Sistema

1. Reinicie o servidor (se estiver rodando):
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente:
   npm start
   ```

2. Acesse a lista de convidados no navegador

3. Vá na aba **"Links"**

4. Procure por **"Personalizar Link (Slug)"**

5. Se aparecer o campo, está funcionando! ✅

---

## 🆘 PRECISA DE AJUDA?

Se ainda tiver dúvidas, me diga:

1. **Qual método você está tentando usar?**
   - Script Node.js
   - SQLTools

2. **Qual erro aparece?** (copie e cole a mensagem)

3. **Onde está rodando o banco?**
   - Local (no seu computador)
   - Render.com
   - Outro serviço

---

## 📝 RESUMO RÁPIDO

**Método mais fácil:**
```bash
node run-migration-074.js
```

**Pronto!** 🎉
