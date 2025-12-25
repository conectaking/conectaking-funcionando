# Executar Migration Manualmente

## Opção 1: Via SQL direto no banco de dados

Se você tem acesso ao banco de dados (DBeaver, pgAdmin, etc), execute este SQL:

```sql
-- Adicionar coluna whatsapp_message na tabela profile_items
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;

-- Comentário na coluna
COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
```

## Opção 2: Via psql (linha de comando)

Se você tem o PostgreSQL instalado localmente:

```powershell
psql -U seu_usuario -d seu_banco -f migrations/007_add_whatsapp_message_to_profile_items.sql
```

## Opção 3: Configurar .env e executar script

1. Crie um arquivo `.env` na pasta `conecta-king-backend` com:

```
DB_USER=seu_usuario
DB_HOST=localhost
DB_DATABASE=nome_do_banco
DB_PASSWORD=sua_senha
DB_PORT=5432
JWT_SECRET=seu_jwt_secret
```

2. Execute:
```powershell
node scripts/run-migrations.js
```

## Verificar se funcionou

Execute este SQL para verificar:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_items' AND column_name = 'whatsapp_message';
```

Se retornar uma linha, a migration foi executada com sucesso!
