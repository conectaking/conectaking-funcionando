-- ===========================================
-- Migration 184: Plano de leitura da Bíblia inteira (365 dias)
-- Cada dia: livro + capítulos + resumo opcional
-- ===========================================

CREATE TABLE IF NOT EXISTS bible_reading_plan_days (
    id SERIAL PRIMARY KEY,
    day_number SMALLINT NOT NULL UNIQUE CHECK (day_number >= 1 AND day_number <= 365),
    book_id VARCHAR(50) NOT NULL,
    chapter_from SMALLINT NOT NULL,
    chapter_to SMALLINT NOT NULL,
    verse_count INTEGER DEFAULT 0,
    summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_plan_day ON bible_reading_plan_days(day_number);
CREATE INDEX IF NOT EXISTS idx_reading_plan_book ON bible_reading_plan_days(book_id);

COMMENT ON TABLE bible_reading_plan_days IS 'Plano de leitura anual: capítulos por dia (2-3 cap/dia conforme tamanho)';

SELECT 'Migration 184: bible_reading_plan_days criada.' AS status;
