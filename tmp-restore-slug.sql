UPDATE users SET profile_slug = 'adrianokingg' WHERE email = 'conectaking@gmail.com';
UPDATE registration_codes SET code = 'ADRIANO-KING'
 WHERE claimed_by_user_id = (SELECT id FROM users WHERE email = 'conectaking@gmail.com' LIMIT 1)
   AND is_claimed = TRUE;
SELECT id, email, profile_slug FROM users WHERE email = 'conectaking@gmail.com';
SELECT code, is_claimed, claimed_by_user_id FROM registration_codes
 WHERE claimed_by_user_id = (SELECT id FROM users WHERE email = 'conectaking@gmail.com' LIMIT 1);
