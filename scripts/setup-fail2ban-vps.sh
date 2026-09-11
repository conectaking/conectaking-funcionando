#!/bin/bash
# Fail2ban para Caddy (401/403 em auth). Requer access.log do Caddy.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq fail2ban

mkdir -p /etc/fail2ban/filter.d /etc/fail2ban/jail.d /var/log/caddy
touch /var/log/caddy/access.log
chown -R caddy:caddy /var/log/caddy 2>/dev/null || true

cat > /etc/fail2ban/filter.d/caddy-auth.conf <<'EOF'
[Definition]
failregex = ^.*"remote_ip":"<HOST>".*"status":(401|403).*"uri":"/api/auth/.*$
            ^.*"remote_ip":"<HOST>".*"status":(401|403).*"uri":"/api/password/.*$
            ^.*\{.*"request".*"remote_ip":"<HOST>".*"status":(401|403).*$
ignoreregex =
EOF

cat > /etc/fail2ban/jail.d/caddy-auth.conf <<'EOF'
[caddy-auth]
enabled = true
port = http,https
filter = caddy-auth
logpath = /var/log/caddy/access.log
maxretry = 12
findtime = 10m
bantime = 1h
backend = auto
EOF

systemctl enable fail2ban
systemctl restart fail2ban
fail2ban-client status caddy-auth
echo "fail2ban caddy-auth OK"
