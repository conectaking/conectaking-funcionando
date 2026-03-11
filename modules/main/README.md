# Módulo Main – Página principal (GET /)

Responsável pela resposta da **rota raiz** (`GET /`):

1. **Domínio personalizado** (ex.: adrianoking.com): se o host estiver vinculado a um site em "Meu site", renderiza `sitePublic` ou página de manutenção.
2. **Caso contrário**: envia `public_html/index.html` se existir; senão retorna JSON de status da API.

## Estrutura

- `main.service.js` – resolve a decisão (domínio personalizado vs. index/JSON) usando `sitesService.getPublicByCustomDomain(host)`.
- `main.controller.js` – aplica a decisão: `res.render`, `res.sendFile` ou `res.json`.
- `main.routes.js` – `GET /` → controller.

Montagem no `server.js`: `app.use('/', mainRoutes)` (antes de publicProfile e demais rotas em `/`).
