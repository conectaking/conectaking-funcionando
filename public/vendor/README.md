# Vendor estático (sem CDN)

Bibliotecas servidas de `/vendor/...` (mesma origem) para reduzir dependência de CDN e facilitar CSP.

| Pasta | Uso |
|-------|-----|
| `fontawesome/` | Ícones (CSS + webfonts) |
| `chartjs/` | Gráficos dashboard |
| `leaflet/` | Mapa localização |
| `cropperjs/` | Corte de imagem |
| `sortablejs/` | Drag-and-drop |
| `qrcodejs/` | QR Code PIX/Wi‑Fi (davidshimjs) |
| `qrcode/` | QR Code (npm `qrcode` — King Docs) |
| `jspdf/` | PDF listas |
| `html2pdf/` | Export PDF preview |
| `pdf-lib/` | PDF King Docs |
| `html5-qrcode/` | Scanner portaria |

Google Fonts permanece em CDN nesta etapa (só tipografia).
Nonces CSP strict ficam para etapa seguinte (muitos `<script>` inline).