-- ===========================================
-- Migration: Adicionar campo send_mode na tabela digital_form_items
-- Data: 2026-01-11
-- Descrição: Adiciona send_mode para distinguir entre "Só WhatsApp", "Só Sistema" e "Ambos"
-- ===========================================

DO $$
BEGIN
    -- Adicionar coluna send_mode se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'digital_form_items' AND column_name = 'send_mode') THEN
        ALTER TABLE digital_form_items ADD COLUMN send_mode VARCHAR(20) DEFAULT 'both';
        RAISE NOTICE 'Coluna send_mode adicionada à tabela digital_form_items';
    END IF;

    -- Atualizar valores existentes baseado em enable_whatsapp e enable_guest_list_submit
    UPDATE digital_form_items
    SET send_mode = CASE
        WHEN enable_guest_list_submit = true THEN 'system-only'
        WHEN enable_whatsapp = true THEN 'both'
        ELSE 'system-only'
    END
    WHERE send_mode IS NULL OR send_mode = '';

    -- Adicionar índice se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'digital_form_items' AND indexname = 'idx_digital_form_items_send_mode') THEN
        CREATE INDEX idx_digital_form_items_send_mode ON digital_form_items(send_mode);
        RAISE NOTICE 'Índice idx_digital_form_items_send_mode criado na tabela digital_form_items';
    END IF;

    RAISE NOTICE 'Migration 072 concluída com sucesso!';
END $$;
