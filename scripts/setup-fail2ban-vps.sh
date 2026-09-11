#!/bin/bash
# Fail2ban básico para Caddy (401/403 em auth). Fallback se CrowdSec não couber no CX22.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq fail2ban

mkdir -p /etc/fail2ban/filter.d /etc/fail2ban/jail.d

cat > /etc/fail2ban/filter.d/caddy-auth.conf <<'EOF'
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"status":(401|403).*"uri":"/api/auth/.*$
            ^.*"remote_ip":"<HOST>".*"status":(401|403).*"uri":"/api/password/.*$
ignoreregex =
EOF

cat > /etc/fail2ban/jail.d/caddy-auth.conf <<'EOF'
[caddy-auth]
enabled = true
port = http,https
filter = caddy-auth
logpath = /var/log/caddy/*.log
            /var/log/caddy/access.log
maxretry = 12
findtime = 10m
bantime = 1h
backend = auto
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "fail2ban caddy-auth OK"
echo "Ajuste logpath se o Caddy usar outro caminho de access log."
