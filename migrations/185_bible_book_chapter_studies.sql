-- ===========================================
-- Migration 185: Estudo por livro e por capítulo da Bíblia
-- bible_book_studies = introdução/visão geral do livro
-- bible_chapter_studies = estudo de um capítulo específico
-- ===========================================

-- 1. Estudo do livro (introdução, contexto, estrutura)
CREATE TABLE IF NOT EXISTS bible_book_studies (
    id SERIAL PRIMARY KEY,
    book_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_studies_book ON bible_book_studies(book_id);

-- 2. Estudo por capítulo (comentário, notas, aplicação)
CREATE TABLE IF NOT EXISTS bible_chapter_studies (
    id SERIAL PRIMARY KEY,
    book_id VARCHAR(50) NOT NULL,
    chapter_number SMALLINT NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(book_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapter_studies_book ON bible_chapter_studies(book_id);
CREATE INDEX IF NOT EXISTS idx_chapter_studies_book_chapter ON bible_chapter_studies(book_id, chapter_number);

COMMENT ON TABLE bible_book_studies IS 'Introdução/visão geral de cada livro da Bíblia';
COMMENT ON TABLE bible_chapter_studies IS 'Estudo/comentário por capítulo (livro + número do capítulo)';

SELECT 'Migration 185: bible_book_studies e bible_chapter_studies criadas.' AS status;
