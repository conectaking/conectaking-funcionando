# Legado Node / public_html

Status (2026-09): **removido do repositório**.

Produção é só Laravel (FrankenPHP). Não existem mais na raiz:

- `server.js`, `routes/` (Express), `modules/`, `public_html/`

Assets canónicos:

- App: `laravel/`
- Estáticos legados/Vite public: `public/` (montado como `/legacy/public` no compose)

Se algum bookmark antigo apontar para `.html` Node, as rotas Blade/`FrontLegacyController` cobrem os aliases principais.
