-- Migration: Adicionar campo logo_fit_mode à tabela profile_items
-- Este campo controla como a logo é ajustada: 'contain' (completo, sem corte) ou 'cover' (com corte, preenche bordas)

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profile_items' 
        AND column_name = 'logo_fit_mode'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN logo_fit_mode VARCHAR(10) DEFAULT 'contain' 
        CHECK (logo_fit_mode IN ('contain', 'cover'));
        
        -- Atualizar registros existentes para usar 'contain' como padrão (completo, sem corte)
        UPDATE profile_items 
        SET logo_fit_mode = 'contain' 
        WHERE logo_fit_mode IS NULL;
        
        RAISE NOTICE 'Coluna logo_fit_mode adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna logo_fit_mode já existe';
    END IF;
END $$;

