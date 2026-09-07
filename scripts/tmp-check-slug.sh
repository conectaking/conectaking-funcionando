#!/bin/bash
set -e
echo "=== slugs ==="
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT profile_slug FROM users WHERE profile_slug ILIKE '%adriano%' OR profile_slug ILIKE '%king%' LIMIT 10"
echo "=== page adrianokingg ==="
curl -sS -o /dev/null -w "%{http_code} size=%{size_download}\n" http://127.0.0.1:5000/adrianokingg
echo "=== api paths ==="
for p in /api/adrianokingg /adrianokingg/api /api/public/profile/adrianokingg; do
  code=$(curl -sS -o /tmp/ckbody -w "%{http_code}" "http://127.0.0.1:5000$p" || echo err)
  ctype=$(file -b --mime-type /tmp/ckbody 2>/dev/null || echo ?)
  echo "$p -> $code $ctype $(head -c 80 /tmp/ckbody | tr '\n' ' ')"
done
