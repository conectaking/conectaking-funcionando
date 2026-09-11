#!/bin/bash
# Verifica SPF/DMARC básicos para conectaking.com.br
set -euo pipefail
DOMAIN="${1:-conectaking.com.br}"

echo "== SPF ($DOMAIN) =="
dig +short TXT "$DOMAIN" | grep -i spf || echo "SPF: missing"

echo "== DMARC =="
dig +short TXT "_dmarc.$DOMAIN" | grep -i dmarc || echo "DMARC: missing"

echo "== MX =="
dig +short MX "$DOMAIN" || echo "MX: none"

echo "Done. DKIM depende do selector do ESP — consultar painel do provedor."
