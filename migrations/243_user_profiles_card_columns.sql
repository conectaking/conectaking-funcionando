-- Colunas essenciais de user_profiles que o app espera (schema inicial era mínimo).
-- Idempotente: ADD COLUMN IF NOT EXISTS.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'Inter';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS background_color VARCHAR(50) DEFAULT '#0B0B0B';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS text_color VARCHAR(50) DEFAULT '#FFFFFF';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS button_color VARCHAR(50) DEFAULT '#FFC700';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS button_text_color VARCHAR(50) DEFAULT '#000000';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS button_opacity NUMERIC(4,2) DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS button_border_radius INTEGER DEFAULT 12;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS background_type VARCHAR(50) DEFAULT 'solid';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS background_image_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS card_background_color VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS card_opacity NUMERIC(4,2) DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS button_font_size INTEGER DEFAULT 16;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS background_image_opacity NUMERIC(4,2) DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_vcard_button BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

SELECT 'Migration 243: colunas de perfil/cartão adicionadas em user_profiles.' AS status;
