-- ===========================================
-- Migration: Adicionar data e endereço do evento ao King Forms
-- Data: 2026-01-10
-- Descrição: Adiciona campos event_date e event_address na tabela digital_form_items
--            para exibir informações do evento no formulário de inscrição
-- ===========================================

-- Adicionar coluna event_date (data do evento)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'event_date'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN event_date DATE;
        
        COMMENT ON COLUMN digital_form_items.event_date IS 'Data do evento (será exibida no formulário de inscrição)';
    END IF;
END $$;

-- Adicionar coluna event_address (endereço do evento)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'event_address'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN event_address VARCHAR(500);
        
        COMMENT ON COLUMN digital_form_items.event_address IS 'Endereço do evento (será exibido no formulário de inscrição)';
    END IF;
END $$;

-- Adicionar índice para event_date (para facilitar buscas/filtros)
CREATE INDEX IF NOT EXISTS idx_digital_form_items_event_date 
ON digital_form_items(event_date) 
WHERE event_date IS NOT NULL;

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration 070: Campos event_date e event_address adicionados com sucesso à tabela digital_form_items';
END $$;
