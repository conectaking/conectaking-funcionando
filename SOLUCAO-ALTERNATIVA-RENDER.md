# 🔧 Solução Alternativa - Executar Migration no Render

## Se o dBeaver não está funcionando, use o Shell do Render

### Opção 1: Via Shell do Render (MAIS FÁCIL)

1. **Acesse o dashboard do Render**
2. Vá em seu serviço PostgreSQL
3. Clique em **"Shell"** (aba ao lado de "Logs")
4. Execute este comando:

```bash
psql $DATABASE_URL -f migrations/017_create_sales_pages_module.sql
```

OU copie e cole o conteúdo do arquivo `MIGRATION-ULTRA-SIMPLES.sql` diretamente no shell.

### Opção 2: Via psql Local (se tiver PostgreSQL instalado)

1. Abra PowerShell ou CMD
2. Navegue até a pasta do projeto
3. Execute:

```bash
psql -h virginia-postgres.render.com -p 5432 -U seu_usuario -d conecta_king_db -f MIGRATION-ULTRA-SIMPLES.sql
```

(Você precisará da senha do banco)

### Opção 3: Executar Comandos Individuais no dBeaver

1. Abra o arquivo `MIGRATION-COMANDOS-INDIVIDUAIS.sql`
2. **Execute CADA comando separadamente**:
   - Selecione apenas o **COMANDO 1**
   - Execute (Ctrl+Enter)
   - Se der erro "já existe", ignore e vá para o próximo
   - Repita para cada comando

### Opção 4: Criar Manualmente no dBeaver

1. No painel esquerdo, clique com botão direito em `Tabelas`
2. Selecione **"Criar Nova Tabela"**
3. Crie cada tabela manualmente usando os campos do script

## 🎯 Recomendação

**Use o Shell do Render** - é a forma mais confiável e rápida!

