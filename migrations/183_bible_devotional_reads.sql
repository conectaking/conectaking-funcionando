-- ===========================================
-- Migration 183: Marcar devocional como lido
-- Tabela para visitantes (visitor_id) e usuários logados (user_id)
-- ===========================================

CREATE TABLE IF NOT EXISTS bible_devotional_reads (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64),
    day_of_year SMALLINT NOT NULL CHECK (day_of_year >= 1 AND day_of_year <= 365),
    read_at TIMESTAMP DEFAULT NOW(),
    user_note TEXT,
    slug VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devotional_reads_user ON bible_devotional_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_devotional_reads_visitor ON bible_devotional_reads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_devotional_reads_day ON bible_devotional_reads(day_of_year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devotional_reads_user_day ON bible_devotional_reads(user_id, day_of_year) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_devotional_reads_visitor_day ON bible_devotional_reads(visitor_id, day_of_year) WHERE visitor_id IS NOT NULL AND visitor_id != '';

COMMENT ON TABLE bible_devotional_reads IS 'Devocionais marcados como lidos (por usuário ou visitante)';

SELECT 'Migration 183: bible_devotional_reads criada.' AS status;
