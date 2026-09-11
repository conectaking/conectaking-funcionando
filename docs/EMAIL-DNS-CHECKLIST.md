# E-mail DNS — checklist Conecta King

Domínio: `conectaking.com.br` · From típico: `noreply@conectaking.com.br`

## Registos

1. **SPF** (TXT em `@`):
   ```
   v=spf1 include:_spf.SEU_PROVEDOR ~all
   ```
2. **DKIM** — TXT do selector fornecido pelo ESP (SendGrid/SES/Mailgun/etc.).
3. **DMARC** (TXT em `_dmarc`):
   ```
   v=DMARC1; p=quarantine; rua=mailto:security@conectaking.com.br; pct=100
   ```
4. **PTR/rDNS** do IP SMTP (pedir ao host do ESP ou VPS se self-host).

## Testes

```bash
bash scripts/check-email-dns.sh
# ou
dig +short TXT conectaking.com.br
dig +short TXT _dmarc.conectaking.com.br
```

Enviar e-mail de teste (recuperação de senha) e validar em https://www.mail-tester.com/

## Vars Laravel

Ver `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` em `.env.prod`.
