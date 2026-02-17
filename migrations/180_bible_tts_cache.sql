-- Cache de áudios TTS da Bíblia (Google TTS + R2)
-- Cada trecho (ref + versão + voz) gera uma chave; o MP3 fica no R2 e a URL é reutilizada.

CREATE TABLE IF NOT EXISTS bible_tts_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(64) NOT NULL UNIQUE,
  r2_key TEXT NOT NULL,
  bible_version VARCHAR(20) NOT NULL,
  ref VARCHAR(50) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'verse',
  voice_name VARCHAR(100) NOT NULL,
  voice_type VARCHAR(50) NOT NULL DEFAULT 'Standard',
  locale VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  content_length BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bible_tts_cache_key ON bible_tts_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_bible_tts_cache_ref_version ON bible_tts_cache(bible_version, ref);

COMMENT ON TABLE bible_tts_cache IS 'Cache de áudios TTS por trecho bíblico; r2_key = caminho no bucket R2';
