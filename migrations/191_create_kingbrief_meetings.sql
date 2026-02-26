-- ===========================================
-- Migration 191: Tabela meetings (KingBrief)
-- Reuniões: áudio no R2, transcrição OpenAI, resumo/mapa mental GPT.
-- ===========================================

CREATE TABLE IF NOT EXISTS kingbrief_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    audio_url TEXT,
    transcript TEXT,
    summary TEXT,
    topics_json JSONB NOT NULL DEFAULT '[]',
    actions_json JSONB NOT NULL DEFAULT '[]',
    mindmap_json JSONB NOT NULL DEFAULT '{"id":"root","title":"Tema Central","collapsed":false,"children":[]}',
    duration_sec INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kingbrief_meetings_user_id ON kingbrief_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_kingbrief_meetings_user_created ON kingbrief_meetings(user_id, created_at DESC);

COMMENT ON TABLE kingbrief_meetings IS 'KingBrief: reuniões com áudio, transcrição, resumo, tópicos, ações e mapa mental';
COMMENT ON COLUMN kingbrief_meetings.audio_url IS 'URL pública do áudio no R2 (kingbrief-audio/...)';
COMMENT ON COLUMN kingbrief_meetings.topics_json IS 'Array de strings com tópicos principais';
COMMENT ON COLUMN kingbrief_meetings.actions_json IS 'Array de { task, owner, due }';
COMMENT ON COLUMN kingbrief_meetings.mindmap_json IS 'Árvore: { id, title, collapsed, children }';

SELECT 'Migration 191: Tabela kingbrief_meetings criada.' AS status;
