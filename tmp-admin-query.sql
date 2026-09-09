SELECT id, email, profile_slug, is_admin, account_type FROM users WHERE email ILIKE '%conectaking%' LIMIT 5;
SELECT code, is_claimed, claimed_by_user_id FROM registration_codes WHERE claimed_by_user_id IN (SELECT id FROM users WHERE email ILIKE '%conectaking%') OR code ILIKE '%ADRIANO%' LIMIT 20;
