-- Cupom + redes (King Selection) — fotos isentas, validade, estado por cliente
ALTER TABLE IF EXISTS king_galleries
  ADD COLUMN IF NOT EXISTS promo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promo_coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS promo_valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_free_photo_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS promo_social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS promo_instructions TEXT;

ALTER TABLE IF EXISTS king_gallery_clients
  ADD COLUMN IF NOT EXISTS promo_social_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_coupon_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_coupon_entered TEXT;

COMMENT ON COLUMN king_galleries.promo_social_links IS 'JSON array: [{ "handle": "@conta", "url": "https://..." }]';
