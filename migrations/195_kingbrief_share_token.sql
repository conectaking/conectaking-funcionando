-- ===========================================
-- Migration 195: Link partilhável KingBrief (share_token)
-- Permite partilhar reunião em modo só leitura sem login.
-- ===========================================

ALTER TABLE kingbrief_meetings
ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_kingbrief_meetings_share_token ON kingbrief_meetings(share_token) WHERE share_token IS NOT NULL;

COMMENT ON COLUMN kingbrief_meetings.share_token IS 'Token para link partilhável (GET /api/kingbrief/shared/:token) – só leitura, sem auth';

SELECT 'Migration 195: share_token em kingbrief_meetings.' AS status;
