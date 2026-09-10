# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via `@mod`
- **CSS de página:** `laravel/resources/css/pub/` via `@css` (incl. `pages/*.css` extraídos das Blades)
- **Fontes:** `resources/css/fonts.css` (self-host via `@fontsource` + material-icons)
- **Vendor npm:** Chart.js, Leaflet, Sortable, Cropper 1.6, jsPDF, html2pdf, html5-qrcode, QRCode → `resources/js/vendor-globals.js`
- **Cartão / portaria / bíblia:** entries Vite `resources/js/pages/cartao-*.js` + boot Blade `__CK_BOOT_*` (nonce CSP)
- **Inlines do painel:** `resources/js/inline/` importados pelos entries
- **CSP:** `script-src 'self' 'nonce-…'` (sem `'unsafe-inline'`). `style-src` ainda `'unsafe-inline'` (atributos `style=""` e CSS dinâmico Blade no cartão)

## Exceções em `public/`
- `config.js` (API_BASE + CSRF/Bearer; `/api-config.js` é alias)
- `sw.js`, `cache-buster.js`, `main.js`
- `guestListEditKingForms.js` → redirect `/guestListEdit`
- `js/recibos-modulo-nav.js`
- `vendor/fontawesome`, `vendor/pdf-lib` (+ fallbacks opcionais)

## Extracção CSS
Script: `laravel/scripts/extract-blade-styles.mjs` — move `<style>` estático para `resources/css/pub/pages/`.
Blocos com `{{ }}` / `@if` ficam na Blade (ex.: cores do cartão).

## Residual
- CSS dinâmico no cartão (`form-public`, `public`, `form-success`)
- Inline `style=""` attributes (impedem CSP style estrito)
- KS blades grandes (`kingSelectionProject`, `kingSelectionCliente`) ainda com CSS inline
- Font Awesome ainda via `/vendor/fontawesome`

**Regra:** código novo só em `laravel/resources/{js,css}` + Vite.
