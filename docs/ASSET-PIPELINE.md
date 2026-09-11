# Pipeline de assets (estado atual)

## Unificado
- **JS:** `laravel/resources/js/legacy/` via `@mod`
- **CSS de página:** `laravel/resources/css/pub/` via `@css` (`pages/*.css`)
- **Fontes / utils:** `fonts.css` + `ck-utils.css` (`.ck-hidden`, flex, inputs, FAQ, …)
- **Ícones:** `fontawesome.css` (`@fortawesome/fontawesome-free`)
- **Vendor npm:** Chart, Leaflet, Sortable, Cropper, jsPDF, html2pdf, html5-qrcode, QR, pdf-lib
- **Cartão:** entries + boots; CSS estático em ficheiros; `:root` dinâmico mínimo (tema)
- **CSP:** `script-src` com nonce; `style-src 'self' 'unsafe-inline'` (necessário para `:root` dinâmico + poucos `style=""` Blade/`display` toggles)

## Exceções `public/`
- `config.js`, `sw.js`, `cache-buster.js`, `main.js`, `js/recibos-modulo-nav.js`
- `vendor/` — só README (sem cópias npm)

## Residual aceitável (~11 `style=""`)
- Dinâmicos Blade no cartão (`width: {{ … }}`, cores, etc.)
- Toggles puros `display:none|block` lidos/escritos por JS legado
- 8 blocos `:root { … }` dinâmicos nas blades do cartão (tema por perfil)

**Regra:** código novo só em `laravel/resources/{js,css}` + Vite.  
Scripts: `scripts/extract-inline-to-css.mjs`, `replace-common-styles.mjs`, `analyze-inline-styles.mjs`.
