-- ===========================================
-- Migration 239: Modelo Vitrine (layout do cartão)
-- Campos em user_profiles — isolados do cartão clássico
-- ===========================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS card_layout VARCHAR(20) DEFAULT 'classic';

COMMENT ON COLUMN user_profiles.card_layout IS 'classic = cartão atual; vitrine = estilo arte + marquee (Modelo Vitrine)';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_hero_url TEXT;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_text TEXT;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_logos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_speed VARCHAR(20) DEFAULT 'slow';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_show_footer BOOLEAN DEFAULT false;

-- Normalizar valores legados / nulos
UPDATE user_profiles
SET card_layout = 'classic'
WHERE card_layout IS NULL OR card_layout NOT IN ('classic', 'vitrine');

SELECT 'Migration 239: card_layout + campos vitrine_* em user_profiles.' AS status;
