#!/bin/bash
set -e
echo "=== Node default (deve ser EJS, sem X-Conecta-Engine laravel no body banner) ==="
curl -sS -D - -o /tmp/n.html http://127.0.0.1:5000/adrianokingg 2>/dev/null | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10
grep -c 'ck-laravel-banner' /tmp/n.html || true
grep -c 'profile-card' /tmp/n.html || true

echo "=== ?laravel=1 (deve ser Laravel público, SEM banner prévia) ==="
curl -sS -D - -o /tmp/lf.html 'http://127.0.0.1:5000/adrianokingg?laravel=1' 2>/dev/null | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10
echo "banner=$(grep -c 'ck-laravel-banner' /tmp/lf.html || true)"
echo "engine_header_check: look above for x-conecta-engine"
echo "verse=$(grep -c 'verse-of-day-box' /tmp/lf.html || true)"
echo "pix=$(grep -c 'profile-button-pix-qrcode' /tmp/lf.html || true)"
echo "share=$(grep -c 'share-btn' /tmp/lf.html || true)"

echo "=== /l/card (prévia COM banner) ==="
curl -sS -o /tmp/lp.html http://127.0.0.1:5000/l/card/adrianokingg
echo "banner=$(grep -c 'ck-laravel-banner' /tmp/lp.html || true)"
echo "DONE"
