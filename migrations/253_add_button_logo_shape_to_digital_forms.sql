-- Migration: 253_add_button_logo_shape_to_digital_forms.sql
-- Descrição: Adiciona colunas button_logo_shape e button_logo_remove_bg para suporte a formatos (quadradinho/arredondada) e remoção de fundo

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'button_logo_shape'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN button_logo_shape VARCHAR(20) DEFAULT 'rounded';
        
        RAISE NOTICE 'Coluna button_logo_shape adicionada à digital_form_items';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'button_logo_remove_bg'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN button_logo_remove_bg BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Coluna button_logo_remove_bg adicionada à digital_form_items';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'button_logo_shape'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN button_logo_shape VARCHAR(20) DEFAULT 'rounded';
        
        RAISE NOTICE 'Coluna button_logo_shape adicionada à guest_list_items';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guest_list_items' 
        AND column_name = 'button_logo_remove_bg'
    ) THEN
        ALTER TABLE guest_list_items 
        ADD COLUMN button_logo_remove_bg BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Coluna button_logo_remove_bg adicionada à guest_list_items';
    END IF;
END $$;
