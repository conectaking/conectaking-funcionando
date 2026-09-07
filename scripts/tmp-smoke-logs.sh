#!/bin/bash
set -e
USER_ID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM users WHERE profile_slug='adrianokingg' LIMIT 1;" | tr -d '[:space:]')
echo "user_id=$USER_ID"

echo "=== vcard ==="
curl -sS -D - -o /tmp/v.vcf "http://127.0.0.1:5000/vcard/adrianokingg" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -10
head -5 /tmp/v.vcf; echo

echo "=== log view ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:5000/log/view/$USER_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

echo "=== log click ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:5000/log/click/item/4" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

echo "=== log vcard ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:5000/log/vcard/$USER_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

# CSRF check — should be 204 not 419
echo "=== direct laravel log (CSRF) ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:8080/log/view/$USER_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

PDF_ID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM profile_items WHERE item_type='pdf' AND is_active LIMIT 1;" | tr -d '[:space:]')
echo "pdf_id=${PDF_ID:-none}"
if [ -n "$PDF_ID" ]; then
  echo "=== pdf ==="
  curl -sS -D - -o /tmp/x.pdf "http://127.0.0.1:5000/download/pdf/$PDF_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type|content-disposition' | head -10
  ls -la /tmp/x.pdf
fi

echo "=== pix ==="
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/api/pix/qrcode/4' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
echo DONE
