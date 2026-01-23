-- ===========================================
-- Migration: Adicionar campos de estilo e personalização visual à Lista de Convidados
-- Data: 2026-01-09
-- Descrição: Adiciona campos de cores, imagens e temas para personalização visual (similar ao KingForms)
-- ===========================================

-- PARTE 1: Adicionar campos de cores
DO $$ 
BEGIN
    -- primary_color: Cor primária do formulário
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'primary_color') THEN
        ALTER TABLE guest_list_items ADD COLUMN primary_color VARCHAR(7) DEFAULT '#4A90E2';
        RAISE NOTICE 'Campo primary_color adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo primary_color já existe na tabela guest_list_items';
    END IF;
    
    -- text_color: Cor do texto
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'text_color') THEN
        ALTER TABLE guest_list_items ADD COLUMN text_color VARCHAR(7) DEFAULT '#333333';
        RAISE NOTICE 'Campo text_color adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo text_color já existe na tabela guest_list_items';
    END IF;
    
    -- background_color: Cor de fundo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'background_color') THEN
        ALTER TABLE guest_list_items ADD COLUMN background_color VARCHAR(7) DEFAULT '#FFFFFF';
        RAISE NOTICE 'Campo background_color adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo background_color já existe na tabela guest_list_items';
    END IF;
END $$;

-- PARTE 2: Adicionar campos de imagens
DO $$ 
BEGIN
    -- header_image_url: Imagem de cabeçalho/abertura
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'header_image_url') THEN
        ALTER TABLE guest_list_items ADD COLUMN header_image_url TEXT;
        RAISE NOTICE 'Campo header_image_url adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo header_image_url já existe na tabela guest_list_items';
    END IF;
    
    -- background_image_url: Imagem de fundo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'background_image_url') THEN
        ALTER TABLE guest_list_items ADD COLUMN background_image_url TEXT;
        RAISE NOTICE 'Campo background_image_url adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo background_image_url já existe na tabela guest_list_items';
    END IF;
    
    -- background_opacity: Opacidade da imagem de fundo (0.0 a 1.0)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'background_opacity') THEN
        ALTER TABLE guest_list_items ADD COLUMN background_opacity DECIMAL(3,2) DEFAULT 1.0 
            CHECK (background_opacity >= 0 AND background_opacity <= 1);
        RAISE NOTICE 'Campo background_opacity adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo background_opacity já existe na tabela guest_list_items';
    END IF;
    
    -- theme: Tema do formulário (light ou dark)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'theme') THEN
        ALTER TABLE guest_list_items ADD COLUMN theme VARCHAR(10) DEFAULT 'light' 
            CHECK (theme IN ('light', 'dark'));
        RAISE NOTICE 'Campo theme adicionado à tabela guest_list_items';
    ELSE
        RAISE NOTICE 'Campo theme já existe na tabela guest_list_items';
    END IF;
END $$;

-- PARTE 3: Comentários
COMMENT ON COLUMN guest_list_items.primary_color IS 'Cor primária do formulário (hexadecimal)';
COMMENT ON COLUMN guest_list_items.text_color IS 'Cor do texto do formulário (hexadecimal)';
COMMENT ON COLUMN guest_list_items.background_color IS 'Cor de fundo do formulário (hexadecimal)';
COMMENT ON COLUMN guest_list_items.header_image_url IS 'URL da imagem de cabeçalho/abertura do formulário';
COMMENT ON COLUMN guest_list_items.background_image_url IS 'URL da imagem de fundo do formulário';
COMMENT ON COLUMN guest_list_items.background_opacity IS 'Opacidade da imagem de fundo (0.0 = transparente, 1.0 = opaco)';
COMMENT ON COLUMN guest_list_items.theme IS 'Tema do formulário: light (claro) ou dark (escuro)';

-- Verificação final
SELECT 'Migration 065 concluída com sucesso! Campos de estilo e personalização visual adicionados.' AS status;

