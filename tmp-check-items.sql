SELECT id, item_type, title, LEFT(COALESCE(destination_url,''),120) AS dest, is_active, display_order
FROM profile_items
WHERE user_id = (SELECT id FROM users WHERE email = 'conectaking@gmail.com' LIMIT 1)
ORDER BY display_order ASC NULLS LAST, id ASC
LIMIT 40;
