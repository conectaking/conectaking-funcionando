# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via `@mod`
- **CSS de página:** `laravel/resources/css/pub/` via `@css`
- **Fontes:** `resources/css/fonts.css` (self-host via `@fontsource` + material-icons)
- **Vendor npm (parciais):** Chart.js, Leaflet, Sortable via `resources/js/vendor-globals.js` (dashboard). Cropper/QR/PDF ainda em `/vendor` (self).
- **CSP:** `script-src 'self' 'nonce-…'` (sem `'unsafe-inline'`). Middleware injeta nonce em todo `<script>` HTML. `style-src` ainda `'unsafe-inline'` (estilos Blade).

## Exceções em `public/`
- `config.js` (unificado: API_BASE + CSRF/Bearer; `/api-config.js` é alias)
- `sw.js`, `cache-buster.js`, `main.js`
- `guestListEditKingForms.js` → redirect `/guestListEdit`
- `js/recibos-modulo-nav.js`, `js/ck-inline/*` (scripts que eram inline)
- `vendor/*`

## Residual (aceitável)
- Alguns `<script>` inline com Blade (`@json` / `{{ }}`) — cobertos por nonce CSP
- Cropper 1.x e libs PDF/QR em `/vendor` (não npm 2.x)

**Regra:** código novo só em `laravel/resources/{js,css}` + Vite.
