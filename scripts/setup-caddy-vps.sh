#!/bin/bash
# Rate-limit Caddy (host) → FrankenPHP :8080 + docs edge.
# Requer Caddy com módulo rate_limit (xcaddy) OU usa throttle Laravel como fallback.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq
apt-get install -y -qq caddy

ufw allow 80/tcp || true
ufw allow 443/tcp || true

# Nota: rate_limit oficial exige build com xcaddy. Aqui usamos matchers +
# headers + reverse_proxy; o throttle Laravel cobre /api/auth e portaria.
# Se tiver Caddy com rate_limit, descomente o bloco RATE_LIMIT abaixo.
cat > /etc/caddy/Caddyfile <<'EOF'
conectaking.com.br {
	redir https://www.conectaking.com.br{uri} 308
}

www.conectaking.com.br, tag.conectaking.com.br {
	encode gzip
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}

	# Auth / portaria: prioridade alta (rate-limit Laravel + logs)
	@sensitive {
		path /api/auth/* /api/password/* /guest-list/confirm/* /portaria/*
	}
	handle @sensitive {
		# RATE_LIMIT: rate_limit { zone auth { key {remote_host} events 40 window 1m } }
		reverse_proxy 127.0.0.1:8080
	}

	handle {
		reverse_proxy 127.0.0.1:8080
	}
}
EOF

systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "Caddy OK → 127.0.0.1:8080 (sensitive paths isolados)"
echo "Ver docs/EDGE-SECURITY.md para CrowdSec/fail2ban"
