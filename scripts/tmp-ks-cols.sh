#!/bin/bash
docker exec conectaking-db psql -U conectaking -d conectaking -c "\d king_galleries" | head -40
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT id, slug, status, title FROM king_galleries WHERE user_id=(SELECT id FROM users WHERE profile_slug='adrianokingg') LIMIT 8;" 2>&1 | head -20
