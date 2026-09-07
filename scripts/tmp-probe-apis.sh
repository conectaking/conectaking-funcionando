#!/bin/bash
set -e
echo "=== verse file ==="
ls -la /opt/conectaking/data/bible/verse_of_day.json 2>/dev/null || echo 'missing on host'
docker exec conectaking-api ls -la /app/data/bible/verse_of_day.json 2>/dev/null || echo 'missing in api'
# sample first item keys
docker exec conectaking-api node -e "const j=require('./data/bible/verse_of_day.json'); console.log('len', j.length); console.log(JSON.stringify(j[0]));" 2>/dev/null || true
# compare node pix for an item
ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM profile_items WHERE item_type='pix_qrcode' AND is_active LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
echo "pix_item=$ITEM"
if [ -n "$ITEM" ]; then
  curl -sS "http://127.0.0.1:5000/api/pix/qrcode/$ITEM" | head -c 200; echo
fi
curl -sS "http://127.0.0.1:5000/api/bible/verse-of-day?translation=nvi" | head -c 300; echo
