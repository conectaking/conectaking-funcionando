#!/bin/bash
set -euo pipefail
# Testa proxies free: icanhazip + g.whatsapp.net via CONNECT
PROXIES=(
  "http://202.28.194.139:31280"
  "http://13.125.44.24:80"
  "http://107.150.41.226:18080"
  "http://213.163.196.45:80"
  "http://47.84.84.1:3128"
  "http://34.44.49.215:80"
  "http://45.91.248.107:80"
  "http://103.95.34.186:3128"
)

echo "=== direto (sem proxy) ==="
curl -sS --max-time 8 https://icanhazip.com || echo FAIL
curl -sS -o /dev/null -w "g.wa:%{http_code}\n" --max-time 8 https://g.whatsapp.net/ || echo "g.wa:FAIL"

for P in "${PROXIES[@]}"; do
  echo "=== $P ==="
  IP=$(curl -sS --max-time 10 -x "$P" https://icanhazip.com 2>/dev/null || echo FAIL)
  echo "exit_ip:$IP"
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 12 -x "$P" https://g.whatsapp.net/ 2>/dev/null || echo FAIL)
  echo "g.whatsapp.net:$CODE"
done
