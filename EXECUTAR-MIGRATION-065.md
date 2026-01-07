# 🚀 Executar Migration 065 - Campos de Estilo da Lista de Convidados

## 📋 O que esta migration faz?

Esta migration adiciona campos de estilo e personalização visual à tabela `guest_list_items`:
- `primary_color` - Cor primária do formulário
- `text_color` - Cor do texto
- `background_color` - Cor de fundo
- `header_image_url` - Imagem de cabeçalho
- `background_image_url` - Imagem de fundo
- `background_opacity` - Opacidade da imagem de fundo
- `theme` - Tema (light/dark)

## ✅ Opção 1: Executar no Render (Recomendado)

### Via Render Shell:

1. Acesse o **Render Dashboard**: https://dashboard.render.com
2. Encontre o serviço **Web Service** (não o PostgreSQL)
3. Clique em **Shell** (terminal)
4. Execute:

```bash
cd /opt/render/project/src
node scripts/run-migration-065.js
```

OU execute diretamente via psql:

```bash
psql $DATABASE_URL -f migrations/065_add_styling_fields_to_guest_list.sql
```

## ✅ Opção 2: Executar Localmente

### Pré-requisitos:
- Arquivo `.env` configurado com as variáveis do banco
- Node.js instalado
- Dependências instaladas (`npm install`)

### Execute:

```bash
# Na raiz do projeto
node scripts/run-migration-065.js
```

## ✅ Opção 3: Executar via DBeaver/pgAdmin

1. Abra o DBeaver ou pgAdmin
2. Conecte-se ao banco de dados
3. Abra o arquivo `migrations/065_add_styling_fields_to_guest_list.sql`
4. Execute todo o conteúdo (Ctrl+Enter)

## ✅ Opção 4: Executar todas as migrations

Se você quiser executar todas as migrations pendentes:

```bash
# No Render Shell ou localmente
npm run migrate
```

**Nota:** Esta opção pode falhar se houver problemas de SSL. Use a Opção 1 ou 3 como alternativa.

## 🔍 Verificar se funcionou:

Execute esta query no banco:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'guest_list_items' 
AND column_name IN (
    'primary_color', 
    'text_color', 
    'background_color',
    'header_image_url',
    'background_image_url',
    'background_opacity',
    'theme'
)
ORDER BY column_name;
```

**Resultado esperado:** 7 linhas com os campos listados acima.

## ⚠️ Importante:

- A migration é **idempotente** (pode ser executada várias vezes sem problemas)
- Se os campos já existirem, a migration não causará erros
- Esta migration é **obrigatória** para que os campos de estilo funcionem na Lista de Convidados

## 📝 Após executar:

1. ✅ Reinicie o servidor se estiver rodando
2. ✅ Teste criar/editar uma Lista de Convidados no KingForms
3. ✅ Verifique se os campos de estilo (cores, imagens, tema) estão funcionando

