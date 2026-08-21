-- ===========================================
-- Migration 242: cores / degradê da faixa rolante (Vitrine)
-- ===========================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_bg_type VARCHAR(20) DEFAULT 'solid';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_color1 VARCHAR(30) DEFAULT '#2A2A2E';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_color2 VARCHAR(30) DEFAULT '#FFC700';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vitrine_marquee_text_color VARCHAR(30) DEFAULT '#FFC700';

COMMENT ON COLUMN user_profiles.vitrine_marquee_bg_type IS 'solid | gradient — fundo da faixa rolante';
COMMENT ON COLUMN user_profiles.vitrine_marquee_color1 IS 'Cor sólida ou início do degradê da faixa';
COMMENT ON COLUMN user_profiles.vitrine_marquee_color2 IS 'Fim do degradê da faixa (se gradient)';
COMMENT ON COLUMN user_profiles.vitrine_marquee_text_color IS 'Cor do texto que rola na faixa';

UPDATE user_profiles
SET vitrine_marquee_bg_type = 'solid'
WHERE vitrine_marquee_bg_type IS NULL OR vitrine_marquee_bg_type NOT IN ('solid', 'gradient');

SELECT 'Migration 242: cores da faixa rolante Vitrine.' AS status;
