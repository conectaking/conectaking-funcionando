# Vendor estático (fallback)

Produção preferencial via Vite/npm (`vendor-globals.js`, `fontawesome.css`, `pdf-lib` no kingDocs).

Pastas em `/vendor/` ficam como fallback de cache antigo / SW — podem ser removidas numa janela dedicada após smoke longo.

| Pasta | npm / Vite |
|-------|------------|
| fontawesome | `@fortawesome/fontawesome-free` |
| chartjs, leaflet, cropperjs, sortablejs | `vendor-globals.js` |
| jspdf, html2pdf, html5-qrcode, qrcode* | `vendor-globals.js` |
| pdf-lib | `pdf-lib` importado em `kingDocs.js` |
