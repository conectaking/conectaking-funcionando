# Pipeline de assets (estado atual)

## O que já está sólido
- **Vite** empacota páginas Blade (`resources/js/pages/*`) e importa legados via alias `@legacy` → pasta `public/`.
- **Vendor** em `public/vendor/` (FA, Chart, Leaflet, Cropper, Sortable, QR, jsPDF, html2pdf, pdf-lib, html5-qrcode) servido em `/vendor/...`.
- Imagem Docker copia `vendor` para `/app/public/vendor` (Caddy) + mount `./public` como `LEGACY_PUBLIC_PATH`.
- **CSP** (`SecurityHeaders`): `script-src 'self' 'unsafe-inline'` — sem CDN de script. Fontes Google ainda externas.

## Unificação total `public/` → só Vite (trabalho longo)
Não é um deploy único: cada módulo grande (`kingSelectionProject.js`, `formPageEdit.js`, `dashboard-*.js`) precisa migrar entry, smoke e remoção do dual.

**Regra daqui pra frente:** código novo só em `laravel/resources/js` + Vite. Não adicionar páginas novas só em `public/`.

## Nonces CSP (próxima etapa de hardening)
Exige `nonce` em **todos** os `<script>` inline das Blades. Enquanto houver inline sem nonce, manter `'unsafe-inline'`. Não misturar nonce + unsafe-inline (browsers modernos ignoram unsafe-inline se houver nonce).
