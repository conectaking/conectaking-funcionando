#!/bin/bash
html=$(curl -sS http://127.0.0.1:5000/l/card/adrianokingg)
echo "$html" | grep -oE 'href="(/[^"]+)"' | head -20
echo '---'
for u in /adrianokingg/form/9 /adrianokingg/minha-loja /vcard/adrianokingg /api/pix/qrcode/4; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:5000$u")
  echo "$u -> $code"
done
echo '--- verse snippet ---'
echo "$html" | grep -o 'verse-of-day[^<]*<[^>]*>[^<]*' | head -5
