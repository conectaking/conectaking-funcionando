# Pipeline de assets (estado atual)

## O que já está sólido
- **Vite** empacota páginas Blade (`resources/js/pages/*`).
- **JS unificado** em `laravel/resources/js/legacy/` via alias `@mod` (fonte única). Cópias em `public/*.js` / `public/js/*.js` são stubs (não carregar via `<script src>`).
- **CSS** ainda pode vir de `public/` via alias `@legacy` (`style.css`, `dashboard.css`, etc.) — empacotado pelo Vite.
- **Vendor** em `public/vendor/` (FA, Chart, Leaflet, Cropper, Sortable, QR, jsPDF, html2pdf, pdf-lib, html5-qrcode) em `/vendor/...`.
- Imagem Docker copia `vendor` para `/app/public/vendor` + mount `./public` como `LEGACY_PUBLIC_PATH`.
- **CSP** (`SecurityHeaders`): `script-src 'self' 'unsafe-inline'` — sem CDN de script. Fontes Google ainda externas.

## Exceções em `public/` (ainda arquivos reais)
- `config.js`, `sw.js`, `cache-buster.js`, `api-config.js` (se existir)
- `js/recibos-modulo-nav.js` (espelho do `@mod`; páginas usam Vite + `data-recibos-nav` no `<body>`)
- `guestListEditKingForms.js` → redirect para `/guestListEdit`

## Já migrado (JS)
- Todos os módulos de página/feature que antes usavam `@legacy/*.js` → `@mod/*.js`
- Inclui: dashboard*, King Selection*, formPageEdit, salesPageEdit, guestListEdit, admin, conta, libs (`ck-auth-gate`, `ck-csrf`, upload helpers, planRenderer, etc.)

## Próximo (opcional)
- Mover CSS de `public/*.css` para `resources/css` e dropar `@legacy` de folhas
- Nonces CSP (só após remover/migrar scripts inline)

**Regra:** código JS novo só em `laravel/resources/js` (+ Vite). Não adicionar páginas novas só em `public/`.
