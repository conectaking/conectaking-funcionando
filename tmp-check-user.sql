SELECT id, email, profile_slug FROM users WHERE email = 'conectaking@gmail.com';
SELECT code, is_claimed, claimed_by_user_id FROM registration_codes WHERE claimed_by_user_id = (SELECT id FROM users WHERE email = 'conectaking@gmail.com' LIMIT 1);
SELECT id, item_type, title, destination_url, is_active FROM profile_items WHERE user_id = (SELECT id FROM users WHERE email = 'conectaking@gmail.com' LIMIT 1) AND item_type ILIKE '%instagram%' ORDER BY id;
