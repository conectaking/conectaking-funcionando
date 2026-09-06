#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Caddy
apt-get update -qq
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq
apt-get install -y -qq caddy

# Liberar portas no UFW
ufw allow 80/tcp || true
ufw allow 443/tcp || true

# Docker API só em localhost (Caddy na frente)
cd /opt/conectaking
cat > docker-compose.prod.yml <<'EOF'
services:
  db:
    image: postgres:16-alpine
    container_name: conectaking-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-conectaking}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-conectaking}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-conectaking} -d ${POSTGRES_DB:-conectaking}"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 10s
    networks:
      - cknet

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: conectaking-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env.prod
    environment:
      PORT: "5000"
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-conectaking}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-conectaking}
      DATABASE_SSL: "false"
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - api_uploads:/app/uploads
    networks:
      - cknet

volumes:
  pgdata:
  api_uploads:

networks:
  cknet:
    driver: bridge
EOF

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Caddyfile
cat > /etc/caddy/Caddyfile <<'EOF'
{
	email admin@conectaking.com.br
}

conectaking.com.br, www.conectaking.com.br, tag.conectaking.com.br {
	encode gzip
	reverse_proxy 127.0.0.1:5000
}
EOF

systemctl enable --now caddy
systemctl reload caddy
sleep 3
systemctl is-active caddy
curl -sS -o /dev/null -w "local:%{http_code}\n" http://127.0.0.1:5000/health
echo CADDY_OK
