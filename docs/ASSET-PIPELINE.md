# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via alias `@mod` (entries em `resources/js/pages/*`).
- **CSS de página:** `laravel/resources/css/pub/` via alias `@css`.
- Cópias em `public/*.js` / `public/js/*.js` são **stubs** (não carregar via `<script src>`).
- CSS em `public/` pode permanecer como espelho; fonte Vite é `@css`.

## Exceções em `public/` (arquivos reais)
- `config.js`, `sw.js`, `cache-buster.js`
- `js/recibos-modulo-nav.js` (espelho; páginas usam Vite + `data-recibos-nav` no `<body>`)
- `guestListEditKingForms.js` → redirect para `/guestListEdit`
- `vendor/*` (FA, Chart, Leaflet, Cropper, Sortable, QR, PDF libs)

## Infra
- Docker: vendor → `/app/public/vendor`; mount `./public` = `LEGACY_PUBLIC_PATH`.
- **CSP:** `script-src 'self' 'unsafe-inline'` (sem CDN de script). Fontes Google ainda externas.
- Nonces CSP: só após migrar/remover scripts inline nas Blades.

**Regra:** código novo só em `laravel/resources/js` / `resources/css` + Vite.
