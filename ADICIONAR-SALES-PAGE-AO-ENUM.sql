-- Adicionar 'sales_page' ao enum item_type_enum
-- Execute este comando se 'sales_page' não aparecer no resultado da verificação

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'sales_page' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'sales_page';
        RAISE NOTICE 'Valor sales_page adicionado ao enum item_type_enum com sucesso!';
    ELSE
        RAISE NOTICE 'Valor sales_page já existe no enum item_type_enum.';
    END IF;
END $$;

-- Verificar novamente
SELECT enumlabel as "Valores do Enum"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
ORDER BY enumsortorder;

