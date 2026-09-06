-- Temas mensais dos Devocionais 365 (admin) — persistência em Postgres
CREATE TABLE IF NOT EXISTS bible_dev365_month_themes (
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  theme_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (year, month)
);

SELECT 'Migration 247: bible_dev365_month_themes OK' AS status;
