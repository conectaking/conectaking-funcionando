# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via `@mod`
- **CSS de página:** `laravel/resources/css/pub/` via `@css`
- **Fontes:** `resources/css/fonts.css` (self-host via `@fontsource` + material-icons)
- **Vendor npm:** Chart.js, Leaflet, Sortable, Cropper 1.6, jsPDF, html2pdf, html5-qrcode, QRCode → `resources/js/vendor-globals.js`
- **Cartão / portaria / bíblia:** entries Vite `resources/js/pages/cartao-*.js` + boot Blade `__CK_BOOT_*` (nonce CSP)
- **Inlines do painel:** `resources/js/inline/` importados pelos entries (dashboard, sales, guestList)
- **CSP:** `script-src 'self' 'nonce-…'` (sem `'unsafe-inline'`). `style-src` ainda `'unsafe-inline'` (atributos `style=""` e CSS Blade)

## Exceções em `public/`
- `config.js` (API_BASE + CSRF/Bearer; `/api-config.js` é alias)
- `sw.js`, `cache-buster.js`, `main.js`
- `guestListEditKingForms.js` → redirect `/guestListEdit`
- `js/recibos-modulo-nav.js`
- `vendor/*` (Font Awesome, pdf-lib, fallbacks)

## Residual
- CSS/JS inline em blades grandes (formPageEdit, responsesList) — `style-src` continua com `'unsafe-inline'`
- Boot scripts pequenos com `@json` nas blades de cartão (cobertos por nonce)

**Regra:** código novo só em `laravel/resources/{js,css}` + Vite.
