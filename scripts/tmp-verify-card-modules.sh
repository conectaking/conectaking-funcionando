#!/bin/bash
set -e
cd /opt/conectaking
curl -sS http://127.0.0.1:5000/l/card/adrianokingg > /tmp/lar2.html
curl -sS -o /dev/null -w 'page:%{http_code}\n' http://127.0.0.1:5000/l/card/adrianokingg
echo "--- markers ---"
for m in share-btn verse-of-day-box Salmos 'Formulário King' 'Página de Vendas' profile-button-pix-qrcode profile-banner kingSelection 'Salvar Contato' pix-qrcode-modal; do
  echo "$m => $(grep -c "$m" /tmp/lar2.html || true)"
done
# links
FORM=$(grep -oE 'href="/adrianokingg/form/[0-9]+"' /tmp/lar2.html | head -1 | tr -d 'href="')
LOJA=$(grep -oE 'href="/adrianokingg/minha-loja"' /tmp/lar2.html | head -1 | tr -d 'href="')
KS=$(grep -oE 'href="/kingSelection/[^"]+"' /tmp/lar2.html | head -1 | tr -d 'href="')
echo "FORM=$FORM LOJA=$LOJA KS=$KS"
for u in "$FORM" "$LOJA" "$KS" "/vcard/adrianokingg" "/api/pix/qrcode/4"; do
  [ -z "$u" ] && continue
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:5000$u")
  echo "$u -> $code"
done
docker logs conectaking-laravel --tail 8
