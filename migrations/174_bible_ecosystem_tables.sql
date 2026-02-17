-- ===========================================
-- Migration 174: Ecossistema Bíblico Completo
-- Devocionais 365, Estudos Bíblicos, Esboços de Pregação
-- ===========================================

-- 1. DEVOCIONAIS 365 DIAS
CREATE TABLE IF NOT EXISTS bible_devotionals_365 (
    id SERIAL PRIMARY KEY,
    day_of_year SMALLINT NOT NULL UNIQUE CHECK (day_of_year >= 1 AND day_of_year <= 365),
    titulo VARCHAR(255) NOT NULL,
    versiculo_ref VARCHAR(100) NOT NULL,
    versiculo_texto TEXT,
    reflexao TEXT NOT NULL,
    aplicacao TEXT NOT NULL,
    oracao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devotionals_day ON bible_devotionals_365(day_of_year);

-- 2. TEMAS DE ESTUDOS BÍBLICOS
CREATE TABLE IF NOT EXISTS bible_study_themes (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    display_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. ESTUDOS BÍBLICOS PROFUNDOS
CREATE TABLE IF NOT EXISTS bible_studies (
    id SERIAL PRIMARY KEY,
    theme_id INTEGER NOT NULL REFERENCES bible_study_themes(id) ON DELETE CASCADE,
    slug VARCHAR(150) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    subtitulo VARCHAR(255),
    introducao TEXT,
    conteudo TEXT NOT NULL,
    referencias TEXT,
    display_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(theme_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_studies_theme ON bible_studies(theme_id);
CREATE INDEX IF NOT EXISTS idx_studies_slug ON bible_studies(slug);

-- 4. CATEGORIAS DE ESBOÇOS
CREATE TABLE IF NOT EXISTS sermon_outline_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    display_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ESBOÇOS DE PREGAÇÃO
CREATE TABLE IF NOT EXISTS sermon_outlines (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES sermon_outline_categories(id) ON DELETE CASCADE,
    slug VARCHAR(150) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    versiculo_base VARCHAR(100),
    introducao TEXT,
    topicos JSONB NOT NULL DEFAULT '[]',
    conclusao TEXT,
    apelo TEXT,
    display_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_outlines_category ON sermon_outlines(category_id);

-- 6. ÍNDICES PARA BUSCA FULL-TEXT (PostgreSQL)
-- Busca unificada em devocionais
ALTER TABLE bible_devotionals_365 ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_devotionals_search ON bible_devotionals_365 USING GIN(search_vector);

-- Busca em estudos
ALTER TABLE bible_studies ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_studies_search ON bible_studies USING GIN(search_vector);

-- Busca em esboços
ALTER TABLE sermon_outlines ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_outlines_search ON sermon_outlines USING GIN(search_vector);

-- Função para atualizar search_vector nos devocionais
CREATE OR REPLACE FUNCTION bible_devotionals_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('portuguese', coalesce(NEW.titulo, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.versiculo_ref, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.reflexao, '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.aplicacao, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devotionals_search_update ON bible_devotionals_365;
CREATE TRIGGER devotionals_search_update
    BEFORE INSERT OR UPDATE ON bible_devotionals_365
    FOR EACH ROW EXECUTE FUNCTION bible_devotionals_search_trigger();

-- Função para estudos
CREATE OR REPLACE FUNCTION bible_studies_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('portuguese', coalesce(NEW.titulo, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.conteudo, '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.introducao, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS studies_search_update ON bible_studies;
CREATE TRIGGER studies_search_update
    BEFORE INSERT OR UPDATE ON bible_studies
    FOR EACH ROW EXECUTE FUNCTION bible_studies_search_trigger();

-- Função para esboços
CREATE OR REPLACE FUNCTION sermon_outlines_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('portuguese', coalesce(NEW.titulo, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.versiculo_base, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.introducao, '') || ' ' || coalesce(NEW.conclusao, '') || ' ' || coalesce(NEW.apelo, '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.topicos::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outlines_search_update ON sermon_outlines;
CREATE TRIGGER outlines_search_update
    BEFORE INSERT OR UPDATE ON sermon_outlines
    FOR EACH ROW EXECUTE FUNCTION sermon_outlines_search_trigger();

SELECT 'Migration 174: Ecossistema Bíblico - tabelas criadas.' AS status;
