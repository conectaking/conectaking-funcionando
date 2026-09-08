#!/bin/bash
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT g.slug, count(p.id) AS photos FROM king_galleries g LEFT JOIN king_photos p ON p.gallery_id=g.id WHERE lower(g.slug)='eliseu' GROUP BY 1;"
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT id, slug FROM king_galleries ORDER BY id DESC LIMIT 10;"
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT p.id FROM king_photos p JOIN king_galleries g ON g.id=p.gallery_id ORDER BY p.id DESC LIMIT 5;"
