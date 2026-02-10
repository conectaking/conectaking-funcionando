-- ===========================================
-- Migration: Criar módulo Convite Digital (editável)
-- Inclui: envelope, conteúdo, local, RSVP, contagem regressiva, temas, galeria, share, calendário, stats
-- ===========================================

-- PASSO 1: Adicionar convite ao item_type_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum' AND e.enumlabel = 'convite'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'convite';
        RAISE NOTICE 'convite adicionado ao item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Tabela convite_items (um por profile_item)
CREATE TABLE IF NOT EXISTS convite_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,

    -- Conteúdo principal
    titulo VARCHAR(255) NOT NULL DEFAULT 'CASAMENTO DE',
    subtitulo VARCHAR(500) NOT NULL DEFAULT 'Nomes',
    texto_abrir VARCHAR(255) DEFAULT 'Toque para abrir',
    subtitulo_extra TEXT,
    texto_pagina_2 TEXT,

    -- Data e hora
    data_dia SMALLINT,
    data_mes VARCHAR(50),
    data_ano SMALLINT,
    dia_semana VARCHAR(50),
    hora VARCHAR(50),

    -- Local
    local_nome VARCHAR(255),
    local_endereco TEXT,
    local_maps_url TEXT,
    dress_code VARCHAR(255),

    -- RSVP / Confirmação
    rsvp_url TEXT,
    rsvp_label VARCHAR(100) DEFAULT 'Confirmar presença',

    -- Áudio e imagens
    som_habilitado BOOLEAN DEFAULT false,
    audio_url TEXT,
    imagem_envelope_url TEXT,
    imagem_fundo_url TEXT,
    imagem_selo_url TEXT,

    -- Aparência
    cor_primaria VARCHAR(20) DEFAULT '#8B4513',
    cor_secundaria VARCHAR(20) DEFAULT '#D2691E',
    tema VARCHAR(50) DEFAULT 'classico',

    -- Funcionalidades
    mostrar_contagem_regressiva BOOLEAN DEFAULT true,
    share_habilitado BOOLEAN DEFAULT true,
    calendar_habilitado BOOLEAN DEFAULT true,
    galeria_fotos JSONB DEFAULT '[]',

    -- Preview e estatísticas
    preview_token VARCHAR(64),
    view_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_convite_items_profile_item ON convite_items(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_convite_items_preview_token ON convite_items(preview_token) WHERE preview_token IS NOT NULL;

COMMENT ON TABLE convite_items IS 'Convites digitais editáveis (casamento, evento)';
COMMENT ON COLUMN convite_items.galeria_fotos IS 'Array de {url, caption} para galeria';
COMMENT ON COLUMN convite_items.tema IS 'classico, minimalista, floral';

CREATE OR REPLACE FUNCTION update_convite_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_convite_items_updated_at ON convite_items;
CREATE TRIGGER trigger_convite_items_updated_at
    BEFORE UPDATE ON convite_items
    FOR EACH ROW
    EXECUTE FUNCTION update_convite_items_updated_at();

-- Tabela opcional: visualizações (para estatísticas detalhadas)
CREATE TABLE IF NOT EXISTS convite_views (
    id BIGSERIAL PRIMARY KEY,
    convite_item_id INTEGER NOT NULL,
    viewed_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (convite_item_id) REFERENCES convite_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_convite_views_item ON convite_views(convite_item_id);
CREATE INDEX IF NOT EXISTS idx_convite_views_at ON convite_views(viewed_at DESC);

SELECT 'Migration 164: Módulo Convite criado.' AS status;
