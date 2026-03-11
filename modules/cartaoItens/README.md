# Módulo Cartão Itens (profile_items)

Responsável por parte do CRUD de itens do cartão (profile_items).

## Rotas já no módulo

- **GET /** – Lista todos os itens do usuário (`/api/profile/items`).
- **GET /:id** – Busca um item por ID com enriquecimento (digital_form_data, guest_list_data) (`/api/profile/items/:id`).

## Rotas ainda em routes/profile.js

As demais rotas de itens permanecem em `routes/profile.js` (POST /items, PUT /items/:id, PATCH, DELETE, duplicate, PUT /items/banner/:id, /items/link/:id, etc.). Podem ser migradas para este módulo ou para submódulos por tipo (ex.: cartaoItens/banner, cartaoItens/link) em etapas futuras.

## Montagem

Em `routes/profile.js`: `router.use('/items', require('../modules/cartaoItens/cartaoItens.routes'));`

As rotas específicas (ex.: PUT /items/banner/:id) devem ser registradas **antes** do `router.use('/items', ...)` para que tenham prioridade sobre GET /:id.
