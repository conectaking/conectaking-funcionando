-- ===========================================
-- Migration 172: Criar módulo Bíblia
-- Rotas isoladas em /api/bible - não altera rotas existentes
-- ===========================================

-- PASSO 1: Adicionar bible ao item_type_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum' AND e.enumlabel = 'bible'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'bible';
        RAISE NOTICE 'bible adicionado ao item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Tabela bible_items (um por profile_item)
CREATE TABLE IF NOT EXISTS bible_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,

    -- Preferências do usuário
    translation_code VARCHAR(20) DEFAULT 'nvi',
    voice_id VARCHAR(100),
    is_visible BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bible_items_profile_item ON bible_items(profile_item_id);

COMMENT ON TABLE bible_items IS 'Configuração do módulo Bíblia por profile_item';

CREATE OR REPLACE FUNCTION update_bible_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bible_items_updated_at ON bible_items;
CREATE TRIGGER trigger_bible_items_updated_at
    BEFORE UPDATE ON bible_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bible_items_updated_at();

-- PASSO 3: Tabela bible_reading_progress (progresso de leitura/audição por usuário)
CREATE TABLE IF NOT EXISTS bible_reading_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    book VARCHAR(50) NOT NULL,
    chapter SMALLINT NOT NULL,
    verse SMALLINT,
    mode VARCHAR(10) NOT NULL DEFAULT 'read' CHECK (mode IN ('read', 'listen')),
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bible_progress_user_book_chapter_verse_mode
    ON bible_reading_progress(user_id, book, chapter, COALESCE(verse, 0), mode);
CREATE INDEX IF NOT EXISTS idx_bible_progress_user ON bible_reading_progress(user_id);

-- PASSO 4: Tabela bible_user_goals (metas configuráveis)
CREATE TABLE IF NOT EXISTS bible_user_goals (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    goal_type VARCHAR(50) DEFAULT 'full_bible' CHECK (goal_type IN ('full_bible', 'nt_only', 'psalms', 'one_chapter_day')),
    target_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SELECT 'Migration 172: Módulo Bíblia criado.' AS status;
