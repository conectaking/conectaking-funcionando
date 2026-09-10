# Vendor estático (mesma origem)

Bibliotecas em `/vendor/...` para CSP e fallback quando o Vite não carrega o pacote npm.

| Pasta | Uso |
|-------|-----|
| `fontawesome/` | Ícones (CSS + webfonts) — ainda via link Blade |
| `pdf-lib/` | PDF King Docs |
| `chartjs/`, `leaflet/`, `cropperjs/`, `sortablejs/`, `qrcodejs/`, `qrcode/`, `jspdf/`, `html2pdf/`, `html5-qrcode/` | Fallback legado; preferir `vendor-globals.js` via Vite |

Fontes: self-host em `resources/css/fonts.css` (não Google Fonts CDN).
Scripts de página: Vite + nonce CSP (`script-src` sem `'unsafe-inline'`).
