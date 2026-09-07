#!/bin/bash
set -e
echo "=== ?laravel=1: texto Prévia ==="
curl -sS 'http://127.0.0.1:5000/adrianokingg?laravel=1' | grep -c 'Prévia Laravel' || true
echo "=== /l/card: texto Prévia ==="
curl -sS 'http://127.0.0.1:5000/l/card/adrianokingg' | grep -c 'Prévia Laravel' || true
echo "=== env.prod ==="
grep -E 'LARAVEL_CARD' /opt/conectaking/.env.prod || true
echo "=== api env ==="
docker exec conectaking-api printenv | grep LARAVEL_CARD || true
echo "=== headers public ==="
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/adrianokingg?laravel=1' | tr -d '\r' | grep -iE 'HTTP/|x-conecta'
echo "=== headers default slug ==="
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/adrianokingg' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || echo '(sem header laravel = Node OK)'
