# Solução: Erro ao Executar COMMENT ON COLUMN

## Problema
Ao executar a migration, você recebeu o erro:
```
ERROR: column "whatsapp_message" of relation "profile_items" does not exist
```

## Causa
O comando `COMMENT ON COLUMN` foi executado antes da coluna ser criada, ou os comandos foram executados juntos em uma transação que falhou.

## Solução: Executar Comandos Separadamente

### No DBeaver:

1. **Execute PRIMEIRO apenas este comando:**
```sql
ALTER TABLE profile_items 
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;
```

2. **Verifique se funcionou:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_items' AND column_name = 'whatsapp_message';
```
Se retornar uma linha, a coluna foi criada!

3. **Depois execute este comando (opcional, apenas para documentação):**
```sql
COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
```

## Alternativa: Script Completo em Uma Transação

Se preferir executar tudo de uma vez, use este script:

```sql
DO $$
BEGIN
    -- Adicionar coluna se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'whatsapp_message'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN whatsapp_message TEXT;
    END IF;
    
    -- Adicionar comentário
    COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
END $$;
```

Este script verifica se a coluna existe antes de criar e adiciona o comentário depois.
