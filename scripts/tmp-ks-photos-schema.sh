#!/bin/bash
set -e
docker exec conectaking-db psql -U conectaking -d conectaking -c "\d king_photos"
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT id, gallery_id, original_name FROM king_photos ORDER BY id;"
