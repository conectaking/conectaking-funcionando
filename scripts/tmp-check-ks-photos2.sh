#!/bin/bash
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT count(*) AS photos FROM king_photos;"
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT g.slug, count(p.id) FROM king_galleries g JOIN king_photos p ON p.gallery_id=g.id GROUP BY 1 ORDER BY 2 DESC LIMIT 10;"
