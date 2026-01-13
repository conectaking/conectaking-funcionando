DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digital_form_items' 
        AND column_name = 'decorative_bar_color'
    ) THEN
        ALTER TABLE digital_form_items 
        ADD COLUMN decorative_bar_color VARCHAR(7);
        
        COMMENT ON COLUMN digital_form_items.decorative_bar_color IS 'Cor das barrinhas decorativas ao lado dos labels dos campos (ex: #FFC700). Se não definido, usa a cor primária.';
        
        RAISE NOTICE 'Coluna decorative_bar_color adicionada com sucesso à digital_form_items!';
    ELSE
        RAISE NOTICE 'Coluna decorative_bar_color já existe na digital_form_items.';
    END IF;
END $$;
SELECT 'Migration 076 concluída com sucesso! Campo decorative_bar_color adicionado à digital_form_items.' AS status;
