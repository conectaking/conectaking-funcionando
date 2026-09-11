# Edge security — Conecta King (VPS)

## Camadas

1. **UFW** — só 22/80/443
2. **Caddy (host)** — TLS + reverse_proxy → `127.0.0.1:8080`
3. **Laravel throttle** — login, password, portaria, admin
4. **Fail2ban** (opcional) — `scripts/setup-fail2ban-vps.sh`
5. **CrowdSec** (opcional, mais RAM) — instalar no host se CX22 aguentar

## Deploy Caddy

```bash
bash /opt/conectaking/scripts/setup-caddy-vps.sh
```

## Fail2ban

```bash
bash /opt/conectaking/scripts/setup-fail2ban-vps.sh
fail2ban-client status caddy-auth
```

## CrowdSec (resumo)

```bash
curl -s https://install.crowdsec.net | sh
cscli collections install crowdsecurity/caddy
# Bouncer firewall ou Caddy conforme docs oficiais
```

Não duplicar scheduler no container `laravel` e num serviço `scheduler` ao mesmo tempo — ver `docker-compose.prod.yml`.
