-- ===========================================
-- Migration: Criar tabelas do módulo KingSelection (isolado)
-- Data: 2026-01-31
-- Descrição: Cria king_galleries, king_photos, king_selections com FKs e índices
-- ===========================================

-- Enum de status (isolado do core)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'king_gallery_status') THEN
        CREATE TYPE king_gallery_status AS ENUM ('preparacao', 'andamento', 'revisao', 'finalizado');
    END IF;
END$$;

-- Galerias
CREATE TABLE IF NOT EXISTS king_galleries (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE,
    nome_projeto VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    status king_gallery_status NOT NULL DEFAULT 'preparacao',
    total_fotos_contratadas INTEGER NOT NULL DEFAULT 0,
    watermark_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_galleries_profile_item_id ON king_galleries(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_king_galleries_slug ON king_galleries(slug);
CREATE INDEX IF NOT EXISTS idx_king_galleries_status ON king_galleries(status);

-- Fotos (originais privados referenciados por file_path)
CREATE TABLE IF NOT EXISTS king_photos (
    id SERIAL PRIMARY KEY,
    gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_photos_gallery_id ON king_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_king_photos_order ON king_photos(gallery_id, "order");

-- Seleções do cliente
CREATE TABLE IF NOT EXISTS king_selections (
    id SERIAL PRIMARY KEY,
    gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
    photo_id INTEGER NOT NULL REFERENCES king_photos(id) ON DELETE CASCADE,
    feedback_cliente TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (gallery_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_king_selections_gallery_id ON king_selections(gallery_id);
CREATE INDEX IF NOT EXISTS idx_king_selections_photo_id ON king_selections(photo_id);

-- Trigger updated_at (reutiliza a função do core, se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_king_galleries_updated_at') THEN
            CREATE TRIGGER update_king_galleries_updated_at
            BEFORE UPDATE ON king_galleries
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END$$;

