#!/bin/bash
# Instala Caddy no VPS e aponta TLS → FrankenPHP :8080
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

cat > /etc/caddy/Caddyfile <<'EOF'
conectaking.com.br {
	redir https://www.conectaking.com.br{uri} 308
}

www.conectaking.com.br, tag.conectaking.com.br {
	encode gzip
	reverse_proxy 127.0.0.1:8080
}
EOF

systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "Caddy OK → 127.0.0.1:8080"
echo "App: cd /opt/conectaking && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"
