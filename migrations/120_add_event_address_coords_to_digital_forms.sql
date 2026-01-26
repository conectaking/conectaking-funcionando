-- ===========================================
-- Migration: Coordenadas do endereço do evento (geocódigo)
-- Descrição: Adiciona event_address_lat e event_address_lon em digital_form_items
--            para fixar o pin no mapa quando o usuário confirma o endereço via autocomplete
-- ===========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'event_address_lat'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN event_address_lat DECIMAL(10, 8);
        COMMENT ON COLUMN digital_form_items.event_address_lat IS 'Latitude do endereço do evento (preenchida ao confirmar no autocomplete)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'event_address_lon'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN event_address_lon DECIMAL(11, 8);
        COMMENT ON COLUMN digital_form_items.event_address_lon IS 'Longitude do endereço do evento (preenchida ao confirmar no autocomplete)';
    END IF;
END $$;
