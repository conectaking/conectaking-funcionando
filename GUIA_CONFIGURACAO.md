# 📋 Guia de Configuração - Personalização do Link da Portaria

## 🎯 Objetivo
Configurar o banco de dados para permitir personalização do link da portaria com slug curto.

---

## 📝 Passo 1: Configurar Conexão no SQLTools

### 1.1 Preencher os Campos Obrigatórios

Na tela do SQLTools que você está vendo, preencha os seguintes campos:

#### **Connection Settings:**
- **Connection name***: `ConectaKing Database` (ou qualquer nome que preferir)
- **Connection group**: (opcional) Deixe vazio ou coloque `Produção`
- **Connect using***: `Server and Port` (já está preenchido)
- **Server Address***: 
  - Se for local: `localhost`
  - Se for remoto (Render.com): Verifique no seu `.env` ou painel do Render
- **Port***: `5432` (padrão PostgreSQL)
- **Database***: Nome do seu banco de dados (verifique no `.env` ou painel)
- **Username***: Seu usuário do PostgreSQL
- **Use password**: Clique e configure a senha

#### **node-pg driver specific options:**
- **SSL**: 
  - Se for local: `Disabled`
  - Se for remoto (Render.com): `Required` ou `Prefer`
- **statement_timeout**: (opcional) Deixe vazio
- **query_timeout**: (opcional) Deixe vazio
- **connectionTimeoutMillis**: (opcional) Deixe vazio

### 1.2 Onde Encontrar as Informações?

Se você não souber os dados de conexão, verifique:

1. **Arquivo `.env`** na raiz do projeto (se existir)
2. **Painel do Render.com** → Seu serviço PostgreSQL → Settings → Internal Database URL
3. **Variáveis de ambiente** no seu servidor

Exemplo de URL do Render:
```
postgresql://usuario:senha@host:5432/nome_do_banco
```

---

## 📝 Passo 2: Testar a Conexão

1. Após preencher todos os campos obrigatórios (marcados com *)
2. Clique em **"Test Connection"** ou **"Save"**
3. Se aparecer erro, verifique:
   - ✅ Usuário e senha estão corretos
   - ✅ Host/endereço está acessível
   - ✅ Porta está correta (5432)
   - ✅ Nome do banco está correto
   - ✅ Firewall permite conexão (se for remoto)

---

## 📝 Passo 3: Executar a Migration

### 3.1 Abrir o Arquivo da Migration

1. No VS Code, abra o arquivo:
   ```
   migrations/074_add_portaria_slug_to_guest_list.sql
   ```

### 3.2 Executar no SQLTools

**Opção A - Via SQLTools:**
1. Conecte-se ao banco usando a conexão que você configurou
2. Abra o arquivo `074_add_portaria_slug_to_guest_list.sql`
3. Selecione todo o conteúdo (Ctrl+A)
4. Clique com botão direito → **"Run Selected Query"** ou use `Ctrl+Shift+E`
5. Aguarde a execução

**Opção B - Via Terminal (psql):**
```bash
psql -h [HOST] -U [USUARIO] -d [DATABASE] -f migrations/074_add_portaria_slug_to_guest_list.sql
```

**Opção C - Via Node.js (se tiver script de migration):**
```bash
node -e "require('./db').pool.query(require('fs').readFileSync('migrations/074_add_portaria_slug_to_guest_list.sql', 'utf8'))"
```

### 3.3 Verificar se Funcionou

Execute esta query para verificar:

```sql
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'guest_list_items' 
AND column_name = 'portaria_slug';
```

**Resultado esperado:**
```
column_name    | data_type | character_maximum_length
---------------|-----------|--------------------------
portaria_slug  | character varying | 50
```

---

## 📝 Passo 4: Verificar no Código

Após executar a migration, verifique se tudo está funcionando:

1. **Reinicie o servidor** (se estiver rodando):
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente
   npm start
   # ou
   node server.js
   ```

2. **Teste a funcionalidade:**
   - Acesse a lista de convidados
   - Vá na aba "Links"
   - Verifique se aparece o campo "Personalizar Link (Slug)"
   - Tente criar um slug (ex: `portaria-2026`)
   - Salve e verifique se o link foi atualizado

---

## 🔍 Troubleshooting (Solução de Problemas)

### Erro: "Connection refused"
- ✅ Verifique se o PostgreSQL está rodando
- ✅ Verifique se a porta está correta
- ✅ Verifique firewall/security groups

### Erro: "Authentication failed"
- ✅ Verifique usuário e senha
- ✅ Verifique se o usuário tem permissões no banco

### Erro: "Database does not exist"
- ✅ Verifique o nome do banco
- ✅ Liste os bancos: `\l` (no psql)

### Erro: "Column already exists"
- ✅ A migration já foi executada antes
- ✅ Tudo está OK, pode continuar

### Migration não aparece no SQLTools
- ✅ Verifique se o arquivo está na pasta `migrations/`
- ✅ Tente executar manualmente copiando e colando o SQL

---

## ✅ Checklist Final

- [ ] Conexão configurada no SQLTools
- [ ] Conexão testada com sucesso
- [ ] Migration executada
- [ ] Campo `portaria_slug` existe na tabela
- [ ] Servidor reiniciado
- [ ] Funcionalidade testada no frontend

---

## 📞 Precisa de Ajuda?

Se tiver problemas, verifique:
1. Logs do servidor
2. Console do navegador (F12)
3. Logs do banco de dados

---

**Pronto!** Após seguir estes passos, você poderá personalizar os links da portaria! 🎉
