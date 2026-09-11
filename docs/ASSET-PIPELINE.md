# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via `@mod`
- **CSS de página:** `laravel/resources/css/pub/` via `@css` (`pages/*.css`)
- **Fontes / utils:** `fonts.css` + `ck-utils.css` (`.ck-hidden`, `.ck-flex-center`, …)
- **Ícones:** `fontawesome.css` (`@fortawesome/fontawesome-free`)
- **Vendor npm:** Chart, Leaflet, Sortable, Cropper, jsPDF, html2pdf, html5-qrcode, QR, **pdf-lib** (kingDocs)
- **Cartão:** entries + boots; CSS estático em ficheiros; `:root` dinâmico mínimo
- **CSP:** `script-src` com nonce; `style-src` ainda `'unsafe-inline'` (restam `style=""`)

## Exceções `public/`
- `config.js`, `sw.js`, `cache-buster.js`, `main.js`, `js/recibos-modulo-nav.js`
- `vendor/*` = fallback legado (FA/chart/etc. já via npm; pdf-lib também via npm agora)

## Residual
- Muitos `style=""` em dashboard/admin/index (parcialmente migrados para `.ck-hidden`)
- Endurecer CSP `style-src` só depois de zerar inline styles

**Regra:** código novo só em `laravel/resources/{js,css}` + Vite.
