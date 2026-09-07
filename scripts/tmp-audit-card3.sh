#!/bin/bash
curl -sS 'http://127.0.0.1:5000/api/bible/verse-of-day?translation=nvi' | head -c 500; echo
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT profile_item_id, translation_code, is_visible, verse_position, verse_size FROM bible_items WHERE profile_item_id=2;"
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT id, slug, name, status FROM king_galleries WHERE user_id=(SELECT id FROM users WHERE profile_slug='adrianokingg') LIMIT 8;"
