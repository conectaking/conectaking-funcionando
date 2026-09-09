# Migração FULL PHP — sem Node

Objetivo: **Caddy → Laravel**, zero container `api` (Express). Front em Blade (ou HTML servido pelo
Laravel até virar Blade). APIs 100% PHP.

## Resposta direta: o Node pode sair?

**Sim, com uma ressalva.** Toda a superfície `/api/*` e as páginas HTML já existem em Laravel.
O único bloqueio funcional que resta é o painel **admin de estudos bíblicos por livro**
(7 rotas, ver [Gaps](#gaps-reais-que-sobram)). Se esse painel puder ficar indisponível por uns dias,
o cutover pode ser feito já.

O Caddy do host já aponta para `127.0.0.1:8080` (Fase 2 feita) e o container `api` está parado, por
isso o `middleware/laravelProxy.js` deixou de estar no caminho — o Laravel responde a tudo.

---

## Edge HTTP: FrankenPHP classic

O container `laravel` corre **FrankenPHP em modo classic** (`frankenphp run --config /app/Caddyfile`),
não Octane/worker. Um binário só: sem nginx, sem php-fpm, sem `artisan serve`.

- `laravel/Caddyfile`: `auto_https off`, `admin off`, `root * /app/public`, `php_server` em `:8080`
- **TLS fica no Caddy do host** — o container é HTTP puro e continua exposto só em `127.0.0.1:8080`
- Cada request arranca o framework do zero (igual a php-fpm), logo não há estado partilhado entre
  requests. É o passo intermédio deliberado: quando o app for para Forge/Octane, muda-se o modo do
  FrankenPHP sem trocar de imagem nem de servidor
- Extensões via `install-php-extensions`: `pdo_pgsql pgsql zip gd opcache`.
  OCR continua a depender de `poppler-utils` + `tesseract-ocr(-por)` instalados por apt

---

## Cobertura atual

Verificado com `scripts/tmp-route-coverage.js` (compara os prefixos `/api/*` do `server.js` com os
de `laravel/routes/web.php`): **todos os prefixos do Express existem no Laravel**.

### Já em Laravel (não migrar de novo)

- Cartão virtual (Blade + APIs) e satélites (form, guest-list, bíblia, loja)
- Profile / upload / analytics / branding
- King Selection completo (painel, cliente, público, watermark, R2, vendas, zip, face)
- Finance + Serasa
- Auth (login/register/refresh/logout/password) + dashboard boot
- Admin bíblia: prosperidade e Dev365 (incluindo jobs assíncronos)
- Documentos (CRUD + OCR: `ocr-info`, `warm-ocr`, `processar-comprovante`), King Docs, orçamentos
- Checkout KingForms/PagBank: **fora de escopo** (não no Laravel; APIs/página removidas)
- Painel admin: overview, `advanced-stats`, `analytics/*`, planos, **users e codes completos**
- Edge: `/health`, `/api/public-api-url`, `/api-config.js`, estáticos `public/` e `public_html/`
- Blade: **35 páginas** em `resources/views/pages/` — auth, dashboard, King Selection, editores de
  satélite, King Docs, documentos/finanças, institucional e admin. Só `checkoutConfig` continua a ser
  servido como HTML estático (ver [Front](#3-front-em-html-legado--fechado-exceto-checkoutconfig))

### Fechado nesta rodada

| Item | O que entrou |
|---|---|
| **B21 — CompareFaces chunked** | `GET /api/king-selection/client/face-results?chunked=1` faz CompareFaces real contra o lote de fotos (`photoSkip`/`photoBatch`), com fallback por recorte de rosto, cache `REKOG_FACE_USE_CACHE` e o mesmo `diagnostics` do Node. Fetch do R2 e chamadas Rekognition vão em `Http::pool` para o chunk caber no timeout do proxy. |
| **B21 — default de `REKOG_ON_DEMAND`** | O PHP considerava on-demand **desligado** quando a env estava ausente; o Node considera **ligado**. Com a env vazia o Laravel devolvia lista vazia em vez de `FACE_USE_CHUNKED` e o cliente via "0 fotos". Agora os dois usam a mesma regra (só desliga com `0`/`false`). |
| **B21 — formato do cache facial** | `POST /client/face-enroll-cache` gravava um array cru; o Node grava e lê `{"photoIds":[...]}`. O Laravel agora escreve no formato do Node e lê os dois. |
| **B16 — mutações admin** | `users`: dashboard, `manage`, `update-role`, `PUT /users/{id}`, `DELETE`, auto-delete (config + execute). `codes`: `generate-manual`, `generate-batch`, `generate-code` (legado), `PUT`/`DELETE /codes/{code}`, auto-delete. Mesmo envelope do `utils/responseFormatter.js`. |
| **B16 — leituras que faltavam** | `advanced-stats`, `analytics/users`, `analytics/user/{id}/details`. |
| **Checkout HTML** | Removido do Laravel (fora de escopo PagBank). Página `/…/checkout` responde **410**. |
| **Front em Blade** | Mais 29 páginas HTML viraram `resources/views/pages/*.blade.php` (King Selection, editores de satélite, King Docs, documentos/orçamentos, institucional, admin). Total: 35. Conversão verificada byte-a-byte com o Blade real; `checkoutConfig` ficou de fora (PagBank). |
| **Edge** | `/api/public-api-url` e `/api-config.js` não existiam no Laravel. O `api-config.js` é servido byte-a-byte igual ao do Express (conferido por `scripts/tmp-check-api-config.php`) — sem ele o dashboard perde o `API_BASE` e o patch de `fetch()`. |

---

## Gaps reais que sobram

### 1. Admin de estudos bíblicos por livro — **migrado**

As 7 rotas de `routes/adminBibleStudy.js` (estudos por livro) estão em Laravel
(`BibleAdminBookStudyController` + `BibleAdminBookStudyService`), com proxy
`isLaravelAdminBiblePath`, CSRF e job async `book-study:run-ai-job`.

### 2. Envio de push — **não é gap**

`utils/pushNotificationService.js` exporta `sendPushNotification`, mas **nenhum ficheiro do projeto o
chama**. Nenhuma rota, nenhum job, nenhum módulo. É código morto: o Node em produção nunca envia push.

O que está em uso é só `GET /api/push/vapid-public-key` e `POST /api/push/subscribe`, ambos já em
Laravel. Portanto **não há nada a migrar** e nada bloqueia o cutover. Reforça isso o facto de o
`docker-compose.prod.yml` passar `VAPID_PUBLIC_KEY` ao container `laravel` mas **não**
`VAPID_PRIVATE_KEY` — sem ela não se envia push de qualquer forma.

Se um dia for preciso enviar de facto, é preciso Web Push completo em PHP (JWT VAPID ES256 + ECDH
P-256 + HKDF + AES-128-GCM). Recomendação: usar `minishlink/web-push` em vez de escrever à mão.

### 3. Front em HTML legado — **fechado, exceto `checkoutConfig`**

**35 páginas** vivem agora em `resources/views/pages/*.blade.php`. Só sobra uma página servida como
ficheiro estático: `checkoutConfig` (PagBank fora de escopo).

| Grupo | Páginas |
|---|---|
| Auth + conta | `login`, `registro`, `recuperar-senha`, `resetar-senha`, `conta`, `dashboard` |
| King Selection | `kingSelection`, `kingSelectionEdit`, `kingSelectionProject`, `kingSelectionCliente`, `kingSelectionGallery`, `kingSelectionReview`, `kingSelectionSuccess` |
| Editores de satélite | `formPageEdit`, `salesPageEdit`, `guestListEdit`, `conviteEdit`, `responsesList` |
| King Docs / Forms | `kingDocs`, `kingDocsShare`, `kingForms` |
| Documentos / finanças | `documentos-preview`, `documentos-ver`, `orcamentos`, `recibos-orcamentos`, `zerar-mes` |
| Institucional / bíblia | `index`, `termos`, `privacidade`, `bible`, `bibliaking`, `arquetipo-resultados` |
| Admin | `admin-planos`, `admin-devocionais-365`, `admin-prosperidade-31` |

`recuperar-senha` e `resetar-senha` vieram dos EJS `views/recuperarSenha.ejs` /
`views/resetarSenha.ejs` e usam Blade a sério (`@php`, `{{ $faviconUrl }}`). Todas as outras são o
HTML legado **byte-a-byte**: um documento completo com `<!DOCTYPE>` dentro do `.blade.php`, que é
Blade válido.

O `LegacyPageController` é a ponte: renderiza `pages.{nome}` se a view existir e, se não existir, cai
no `FrontLegacyController::page` (HTML de `public/`/`public_html/`). As páginas convertidas saíram do
array `$legacyPages` de `routes/web.php` e entraram em `$bladePages`, que aponta para o
`LegacyPageController` e regista também as variantes `/l/…`.

#### Como converter (e por que não parte nada)

`scripts/tmp-html-to-blade.php` gera o `.blade.php` e `scripts/tmp-verify-blade-pages.php` confirma o
resultado bootando o Laravel a sério. Ambos correm sem PHP local:

```bash
docker run --rm -v "$PWD:/repo" -w /repo php:8.4-cli php scripts/tmp-html-to-blade.php <nome> …
docker run --rm -v "$PWD:/repo" -w /repo php:8.4-cli php scripts/tmp-verify-blade-pages.php
```

O conversor tenta três estratégias por página e **só escreve o ficheiro quando o compilador Blade
devolve exatamente os bytes do HTML de origem**:

1. **cópia crua** — funcionou em 28 das 29 páginas desta rodada. Blade deixa `@media`, `@keyframes`
   e emails intactos porque só compila diretivas que existem;
2. **escape** de `@` → `@@` e de `{{` / `{!!` → `@{{` / `@{!!`;
3. **`@verbatim`** a envolver o documento — necessário só em `kingSelectionProject`.

A fonte é escolhida por `laravel/public/shell/` → `public/` → `public_html/`. `public/` vem antes de
`public_html/` de propósito: é essa a ordem do `FrontLegacyController` em produção
(`LEGACY_PUBLIC_PATH=/legacy/public`), logo o Blade fica com o mesmo ficheiro que já era servido.
Isso só importou em duas páginas — `kingSelectionProject` e `recibos-orcamentos`, onde `public/` está
mais recente; nas restantes os dois diretórios são idênticos.

`guestListEditManage` **não existe** em nenhum dos diretórios (o ficheiro parecido é
`guestListEditKingForms.html`, que não tinha rota), por isso não foi convertido.

O verificador reporta `recuperar-senha` como "diferente" e `resetar-senha` como "sem HTML de origem":
é esperado, são as duas que vieram de EJS — `public_html/recuperar-senha.html` é um stub antigo de
1 KB sem relação com a página atual.

⚠️ Os HTML de `public/`, `public_html/` e `laravel/public/shell/` continuam no repo, mas para as 35
páginas acima **já não são o que é servido** — a fonte de verdade passou a ser
`resources/views/pages/*.blade.php`. Quem editar só o HTML (ou usar os `scripts/tmp-deploy-*.sh`) não
vai ver a alteração no site. Eles ainda servem `checkoutConfig`, os assets (`.js`/`.css`/imagens) e
as páginas sem rota própria (`dashboard-recibos-orcamentos`, `clientes-recibos-orcamentos`,
`configuracoes-recibos-orcamentos`, `guestListEditKingForms`, …).

---

## Riscos do cutover (ler antes de mexer no Caddy)

**Este é o ponto mais importante do documento.** Enquanto o Node é o edge, o
`middleware/laravelProxy.js` decide rota a rota o que vai para o Laravel, e essa decisão é governada
por flags de ambiente do container `api`:

| Flag | Default no compose |
|---|---|
| `LARAVEL_CARD_PUBLIC` | `false` |
| `LARAVEL_PROFILE_API` | `false` |
| `LARAVEL_UPLOAD_API` | `false` |
| `LARAVEL_SATELLITES` | `false` |
| `LARAVEL_KS` | `false` |
| `LARAVEL_ADMIN_BIBLE` | (segue satélites) |

Quando o Caddy apontar para `:8080`, **o proxy deixa de existir e as flags deixam de ter efeito**:
o Laravel passa a responder tudo de uma vez. Qualquer rota que hoje esteja com a flag em `false`
nunca foi exercitada em produção e vai a produção no mesmo segundo.

Por isso o cutover tem de ser em duas etapas: **primeiro ligar todas as flags no Node e observar**,
só depois mudar o Caddy. É exatamente o que o checklist abaixo faz.

---

## Checklist de cutover (Caddy → :8080)

### Fase 0 — pré-requisitos

- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.prod ps` mostra `laravel` saudável
- [ ] Confirmar no `.env.prod` do VPS que o container `laravel` recebe todas as envs que o `api`
      recebia e que o PHP usa: `JWT_SECRET`, `DATABASE_*`, `AWS_*`, `REKOG_*`, `R2_*`,
      `OPENAI_API_KEY`, `SMTP_*`/`EMAIL_*`, `MERCADOPAGO_*`, `PAGBANK_*`, `CHECKOUT_ENCRYPTION_KEY`,
      `PUBLIC_APP_URL`, `API_URL`
- [ ] Backup do banco: `docker exec conectaking-db pg_dump -U conectaking conectaking > /opt/backup-pre-cutover.sql`
- [ ] Guardar cópia do `Caddyfile` atual

### Fase 1 — ligar tudo no Node (ainda com rollback fácil)

Este passo põe o Laravel a servir 100% do tráfego **através** do Node. Se algo partir, basta voltar a
flag a `false` e recriar o `api` — sem tocar em DNS nem TLS.

```bash
cd /opt/conectaking
# no .env.prod:
LARAVEL_CARD_PUBLIC=true
LARAVEL_CARD_SLUGS=
LARAVEL_PROFILE_API=true
LARAVEL_UPLOAD_API=true
LARAVEL_SATELLITES=true
LARAVEL_ADMIN_BIBLE=true
LARAVEL_DASHBOARD=true
LARAVEL_KS=true
LARAVEL_KS_SLUGS=

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
```

- [ ] Rodar o smoke da Fase 3 **contra a porta 5000** (`http://127.0.0.1:5000`)
- [ ] Deixar correr pelo menos um ciclo de uso real (idealmente 24h) e vigiar
      `docker logs -f conectaking-laravel`
- [ ] Onde a resposta trouxer `X-Conecta-Engine: laravel`, está confirmado que quem serviu foi o
      PHP. O header é carimbado pelos controllers (não há middleware global), por isso a **ausência**
      não prova nada — mas a presença prova. Use-o para confirmar as rotas novas, sobretudo as de
      admin e checkout.

### Fase 2 — mudar o Caddy — ✅ FEITO (2026-09-08/09)

```caddyfile
# antes
reverse_proxy 127.0.0.1:5000
# depois
reverse_proxy 127.0.0.1:8080
```

Backup: `/etc/caddy/Caddyfile.bak-pre-php-*` · DB dump: `/opt/backup-pre-cutover-*.sql`

- [x] `curl -sS https://www.conectaking.com.br/health` → `{"status":"ok","engine":"laravel",...}`
- [x] Container `api` **parado** (`docker compose ... stop api`); só `laravel` + `db` up

### Fase 3 — smoke

Anónimo (sem token):

```bash
BASE=https://www.conectaking.com.br
curl -sS -o /dev/null -w '%{http_code} health\n'        $BASE/health
curl -sS -o /dev/null -w '%{http_code} api-config\n'    $BASE/api-config.js
curl -sS -o /dev/null -w '%{http_code} public-api-url\n' $BASE/api/public-api-url
curl -sS -o /dev/null -w '%{http_code} login\n'         $BASE/login
curl -sS -o /dev/null -w '%{http_code} dashboard\n'     $BASE/dashboard
curl -sS -o /dev/null -w '%{http_code} cartao\n'        $BASE/adrianokingg
curl -sS -o /dev/null -w '%{http_code} vapid\n'         $BASE/api/push/vapid-public-key
curl -sS -o /dev/null -w '%{http_code} plans-public\n'  $BASE/api/subscription/plans-public
```

Autenticado (`TOKEN` de utilizador comum, `ADMIN` de administrador):

```bash
H="Authorization: Bearer $TOKEN"
curl -sS -o /dev/null -w '%{http_code} account\n'   -H "$H" $BASE/api/account/status
curl -sS -o /dev/null -w '%{http_code} profile\n'   -H "$H" $BASE/api/profile
curl -sS -o /dev/null -w '%{http_code} finance\n'   -H "$H" $BASE/api/finance/dashboard
curl -sS -o /dev/null -w '%{http_code} kingdocs\n'  -H "$H" $BASE/api/king-docs/files
curl -sS -o /dev/null -w '%{http_code} docs\n'      -H "$H" $BASE/api/documentos

A="Authorization: Bearer $ADMIN"
curl -sS -o /dev/null -w '%{http_code} adm stats\n'    -H "$A" $BASE/api/admin/stats
curl -sS -o /dev/null -w '%{http_code} adm advanced\n' -H "$A" $BASE/api/admin/advanced-stats
curl -sS -o /dev/null -w '%{http_code} adm users\n'    -H "$A" $BASE/api/admin/users
curl -sS -o /dev/null -w '%{http_code} adm codes\n'    -H "$A" $BASE/api/admin/codes
curl -sS -o /dev/null -w '%{http_code} adm autodel\n'  -H "$A" $BASE/api/admin/codes/auto-delete-config
```

Fluxos que só se validam no browser (fazer manualmente):

- [ ] Login → dashboard carrega os módulos
- [ ] Criar/editar um link no editor de perfil e fazer upload de imagem
- [ ] Abrir um cartão público e um formulário público; submeter o formulário
- [ ] Se houver checkout ativo: `/{slug}/form/{itemId}/checkout?submissionId=...` renderiza e o
      Pix gera QR
- [ ] King Selection: galeria pública → login do cliente → seleção → finalizar
- [ ] **Reconhecimento facial** (é o caminho novo): cadastrar rosto e correr "buscar minhas fotos".
      Confirmar na aba Network vários `face-results?chunked=1&photoSkip=…` a devolver `200` com
      `faceChunk: true`, e a barra de progresso a avançar até 100%
- [ ] Admin: gerar código de registo, editar validade e apagar; abrir o dashboard de um utilizador

### Fase 4 — desligar o Node — ✅ parado em produção

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod stop api
```

- [x] Smoke com `api` parado (health/login/account/documentos/king-docs/admin/plans)
- [ ] Deixar parado 24–48h antes de remoção definitiva do compose

Remoção definitiva (depois do período de observação):

- [ ] Apagar o serviço `api` do `docker-compose.prod.yml`
- [ ] Remover `NODE_INTERNAL_URL` do serviço `laravel`
- [ ] `docker compose ... up -d --remove-orphans` e `docker image prune`
- [ ] Apagar `middleware/laravelProxy.js` e residual Express no repo

### Rollback

| Etapa | Como voltar atrás |
|---|---|
| Fase 1 | Repor as flags `LARAVEL_*` em `.env.prod` e `up -d --force-recreate --no-deps api` |
| Fase 2 | `reverse_proxy 127.0.0.1:5000` no Caddyfile + `systemctl reload caddy` |
| Fase 4 | `docker compose ... start api` e Caddy de volta para `:5000` |

O rollback da Fase 2 é o mais importante e leva segundos — por isso vale a pena não remover o
serviço `api` do compose no mesmo dia do cutover.

---

## Notas de ambiente

**Checkout/PagBank:** fora de escopo — código e envs removidos do Laravel. Não reintroduzir sem pedido explícito.

**Reconhecimento facial:** o Laravel lê as mesmas envs do Node —
`REKOG_ON_DEMAND`, `REKOG_COMPARE_SIMILARITY_THRESHOLD`, `REKOG_SPEED_MODE_DEFAULT`,
`REKOG_SOURCE_VERIFY_MIN_CONFIDENCE`, `REKOG_FACE_USE_CACHE`, `KINGSELECTION_FACE_COMPARE_MAX_PX`,
`KINGSELECTION_FACE_COMPARE_CONCURRENCY`, `KINGSELECTION_FACE_RELAXED_THRESHOLD`,
`KINGSELECTION_FACE_FALLBACK_THRESHOLD`, `KINGSELECTION_FACE_CROP_*`. Como vêm todas do
`env_file: .env.prod`, os dois containers veem os mesmos valores.

**`API_URL`** passa a ser lida também pelo Laravel (para `/api/public-api-url`).
