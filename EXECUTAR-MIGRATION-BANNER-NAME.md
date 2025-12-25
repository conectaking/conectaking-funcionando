# Executar Migration: Adicionar Campo whatsapp_message

## O que esta migration faz:
Adiciona o campo `whatsapp_message` na tabela `profile_items` para armazenar mensagens personalizadas do WhatsApp separadamente do nome do banner.

## Como executar:

### Opção 1: Manualmente no Banco de Dados (MAIS FÁCIL E SEGURO)
Execute este SQL no seu banco de dados (DBeaver, pgAdmin, ou qualquer cliente SQL):

**RECOMENDADO - Versão Segura (executa tudo em uma transação):**
```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profile_items' 
        AND column_name = 'whatsapp_message'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN whatsapp_message TEXT;
    END IF;
    
    COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
END $$;
```

**OU execute os comandos separadamente (se a versão acima não funcionar):**

1. Primeiro execute:
```sql
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;
```

2. Depois execute (opcional, apenas para documentação):
```sql
COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
```

### Opção 2: Via Script (requer .env configurado)
Se você tem um arquivo `.env` configurado:

```powershell
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
node scripts/run-migrations.js
```

## Verificar se funcionou:
Execute este SQL para verificar:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_items' AND column_name = 'whatsapp_message';
```

Se retornar uma linha, a migration foi executada com sucesso!

## Importante:
- Esta migration é segura e pode ser executada múltiplas vezes (usa `IF NOT EXISTS`)
- Não afeta dados existentes
- Apenas adiciona uma nova coluna opcional
