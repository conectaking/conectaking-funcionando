# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via `@mod`
- **CSS de página:** `laravel/resources/css/pub/` via `@css` (incl. `pages/*.css`)
- **Fontes:** `resources/css/fonts.css` (`@fontsource` + material-icons)
- **Ícones:** `resources/css/fontawesome.css` (`@fortawesome/fontawesome-free` via Vite) — sem `/vendor/fontawesome` nas Blades
- **Vendor npm:** Chart/Leaflet/Sortable/Cropper/jsPDF/html2pdf/html5-qrcode/QR → `vendor-globals.js`
- **Cartão:** entries `cartao-*.js` + boots `__CK_BOOT_*`; CSS estático em `pages/cartao-*.css`; tokens dinâmicos ficam em `<style>:root{…}</style>` mínimo
- **CSP:** `script-src 'self' 'nonce-…'`. `style-src` ainda `'unsafe-inline'` (`style=""` + `:root` dinâmico)

## Exceções em `public/`
- `config.js` (+ alias `/api-config.js`)
- `sw.js`, `cache-buster.js`, `main.js`
- `js/recibos-modulo-nav.js`
- `vendor/pdf-lib` (+ fallbacks opcionais; Font Awesome vendor pode permanecer como backup)

## Scripts
- `extract-blade-styles.mjs`, `extract-cartao-split-styles.mjs`, `split-dynamic-cartao-styles.mjs`, `wire-page-css.mjs`

## Residual
- Atributos `style=""` em massa (dashboard/admin/index)
- `vendor/pdf-lib` ainda lazy em kingDocs

**Regra:** código novo só em `laravel/resources/{js,css}` + Vite.
