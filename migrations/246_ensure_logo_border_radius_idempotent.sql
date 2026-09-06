-- Migration 246: recuperação idempotente se 243/244 falharam mas foram marcadas como OK
-- (bug antigo do auto-migrate que engolia 42703/42P01).

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_size INTEGER DEFAULT 60;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_link TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'button_border_radius'
      AND data_type IN ('integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision')
  ) THEN
    ALTER TABLE user_profiles
      ALTER COLUMN button_border_radius TYPE TEXT
      USING (
        CASE
          WHEN button_border_radius IS NULL THEN NULL
          ELSE button_border_radius::text || 'px'
        END
      );
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'button_border_radius'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN button_border_radius TEXT DEFAULT '12px';
  END IF;
END $$;

ALTER TABLE user_profiles ALTER COLUMN button_border_radius SET DEFAULT '12px';

SELECT 'Migration 246: logo + button_border_radius OK.' AS status;
