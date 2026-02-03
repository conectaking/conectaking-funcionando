# R2 via Subdomínio (r2.conectaking.com.br)

Configuração alinhada ao prompt: URL pública na raiz, sem `/ks/file/`.

## Variáveis no Render

```
R2_PUBLIC_BASE_URL=https://r2.conectaking.com.br
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ACCOUNT_ID=...
R2_BUCKET=kingselection
```

**R2_PUBLIC_BASE_URL** – Sem barra no final.

## Formato da URL

```
https://r2.conectaking.com.br/<objectKey>
```

Exemplo: `https://r2.conectaking.com.br/galleries/123/abc.jpg`

## Banco de Dados

Salvar apenas o objectKey (com prefixo `r2:`):

- ✅ `r2:galleries/123/uuid.jpg`
- ❌ `https://r2.conectaking.com.br/...`
- ❌ `https://pub-xxx.r2.dev/...`

## Worker (Cloudflare)

- **Leitura:** GET `/*` → serve do R2 (objectKey = pathname sem `/`)
- **Upload:** POST `/ks/upload` (com token Bearer)
- **Binding:** `R2_BUCKET` → bucket `kingselection`

## CORS no bucket R2 (para upload direto via presign)

No Cloudflare → R2 → kingselection → Settings → CORS:

- **Allowed origins:** `https://conectaking.com.br`, `https://www.conectaking.com.br`
- **Methods:** PUT, GET, HEAD
- **Allowed headers:** content-type, cache-control

## Checklist de validação

- [ ] `https://r2.conectaking.com.br/galleries/ADR7542.jpg` abre no navegador
- [ ] Worker com binding `R2_BUCKET` em `kingselection`
- [ ] Backend salva só `r2:galleries/...` no banco
- [ ] Backend monta URL com `R2_PUBLIC_BASE_URL`
- [ ] Galeria King Selection carrega imagens
- [ ] CORS no bucket R2 (para upload direto)

## Deploy do Worker

```bash
cd cf-worker-kingselection-r2
npx wrangler deploy
```

## IMPORTANTE: r2.conectaking.com.br deve apontar para o WORKER

O domínio `r2.conectaking.com.br` precisa receber as requisições no **Worker** (não no bucket R2 diretamente).

1. **Remova** o domínio do R2 bucket (Custom Domains) se estiver lá — o bucket não sabe tratar POST /ks/upload.
2. **Adicione** a rota no Worker (já está no wrangler.toml) e faça deploy.
3. No **Cloudflare Dashboard** → **Workers & Pages** → **kingselection-r2** → **Triggers** → confira se a rota `r2.conectaking.com.br/*` aparece. Se não aparecer após o deploy, cadastre manualmente.
