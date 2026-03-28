-- ===========================================
-- Migration: Jobs de separação automática por pastas (rosto)
-- Data: 2026-03-28
-- ===========================================

CREATE TABLE IF NOT EXISTS king_folder_auto_jobs (
  id BIGSERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|processing|done|error|cancelled
  stage VARCHAR(40) NOT NULL DEFAULT 'queued',   -- queued|processing_faces|separating_folders|done|error
  message TEXT,
  min_similarity NUMERIC(5,2) NOT NULL DEFAULT 72,
  force_reprocess BOOLEAN NOT NULL DEFAULT FALSE,
  total_photos INTEGER NOT NULL DEFAULT 0,
  processed_photos INTEGER NOT NULL DEFAULT 0,
  error_photos INTEGER NOT NULL DEFAULT 0,
  assigned_photos INTEGER NOT NULL DEFAULT 0,
  options_json JSONB,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_folder_auto_jobs_gallery_created
  ON king_folder_auto_jobs(gallery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_king_folder_auto_jobs_status
  ON king_folder_auto_jobs(status, stage);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_king_folder_auto_jobs_updated_at') THEN
      CREATE TRIGGER update_king_folder_auto_jobs_updated_at
      BEFORE UPDATE ON king_folder_auto_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END$$;

