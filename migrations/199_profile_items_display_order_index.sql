-- Índice para acelerar GET /api/profile/items (WHERE user_id = $1 ORDER BY display_order ASC)
CREATE INDEX IF NOT EXISTS idx_profile_items_user_display_order
ON profile_items(user_id, display_order ASC);
