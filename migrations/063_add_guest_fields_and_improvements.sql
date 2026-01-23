-- ===========================================
-- Migration: Adicionar campos extras e melhorias na Lista de Convidados
-- Data: 2026-01-07
-- Descrição: Adiciona campos WhatsApp, endereço, bairro, cidade, Instagram e melhorias
-- ===========================================

-- PARTE 1: Adicionar novos campos na tabela guests
DO $$ 
BEGIN
    -- WhatsApp (obrigatório)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'whatsapp') THEN
        ALTER TABLE guests ADD COLUMN whatsapp VARCHAR(50);
        RAISE NOTICE 'Campo whatsapp adicionado à tabela guests';
    END IF;
    
    -- Endereço
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'address') THEN
        ALTER TABLE guests ADD COLUMN address VARCHAR(255);
        RAISE NOTICE 'Campo address adicionado à tabela guests';
    END IF;
    
    -- Bairro
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'neighborhood') THEN
        ALTER TABLE guests ADD COLUMN neighborhood VARCHAR(100);
        RAISE NOTICE 'Campo neighborhood adicionado à tabela guests';
    END IF;
    
    -- Cidade
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'city') THEN
        ALTER TABLE guests ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Campo city adicionado à tabela guests';
    END IF;
    
    -- Estado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'state') THEN
        ALTER TABLE guests ADD COLUMN state VARCHAR(2);
        RAISE NOTICE 'Campo state adicionado à tabela guests';
    END IF;
    
    -- CEP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'zipcode') THEN
        ALTER TABLE guests ADD COLUMN zipcode VARCHAR(10);
        RAISE NOTICE 'Campo zipcode adicionado à tabela guests';
    END IF;
    
    -- Instagram (opcional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guests' AND column_name = 'instagram') THEN
        ALTER TABLE guests ADD COLUMN instagram VARCHAR(100);
        RAISE NOTICE 'Campo instagram adicionado à tabela guests';
    END IF;
END $$;

-- PARTE 2: Adicionar campo de visualização pública completa na guest_list_items
DO $$ 
BEGIN
    -- Token para visualização pública completa (portaria)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'guest_list_items' AND column_name = 'public_view_token') THEN
        ALTER TABLE guest_list_items ADD COLUMN public_view_token VARCHAR(100) UNIQUE;
        RAISE NOTICE 'Campo public_view_token adicionado à tabela guest_list_items';
    END IF;
    
    -- Campo para nomear a lista ao criar
    -- (event_title já existe, mas vamos garantir que seja usado corretamente)
END $$;

-- PARTE 3: Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_guests_whatsapp ON guests(whatsapp);
CREATE INDEX IF NOT EXISTS idx_guests_name_search ON guests USING gin(to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_guests_email_search ON guests USING gin(to_tsvector('portuguese', COALESCE(email, '')));
CREATE INDEX IF NOT EXISTS idx_guest_list_items_public_view_token ON guest_list_items(public_view_token);

-- PARTE 4: Comentários
COMMENT ON COLUMN guests.whatsapp IS 'Número de WhatsApp (obrigatório)';
COMMENT ON COLUMN guests.document IS 'CPF/CNPJ (obrigatório)';
COMMENT ON COLUMN guests.address IS 'Endereço completo (opcional)';
COMMENT ON COLUMN guests.neighborhood IS 'Bairro (opcional)';
COMMENT ON COLUMN guests.city IS 'Cidade (opcional)';
COMMENT ON COLUMN guests.state IS 'Estado (UF - opcional)';
COMMENT ON COLUMN guests.zipcode IS 'CEP (opcional)';
COMMENT ON COLUMN guests.instagram IS 'Instagram (opcional)';
COMMENT ON COLUMN guest_list_items.public_view_token IS 'Token único para link público de visualização completa (portaria)';

-- Verificação final
SELECT 'Migration 063 concluída com sucesso! Campos extras adicionados.' AS status;
