# Partials dos itens do cartão (profile)

Cada tipo de item do cartão pode ter um partial em `types/<item_type>.ejs`.
A variável disponível em todos os partials é **`item`**.

## Partials já criados

| item_type      | Arquivo              | Descrição           |
|----------------|----------------------|---------------------|
| link           | types/link.ejs       | Link personalizado  |
| banner         | types/banner.ejs     | Banner (imagem)     |
| whatsapp       | types/whatsapp.ejs   | WhatsApp            |

## Tipos restantes (podem ser extraídos do profile.ejs)

Conforme `docs/LISTA-COMPLETA-SEPARACAO.md`: telegram, email, instagram, facebook, tiktok, twitter, youtube, linkedin, portfolio, pinterest, reddit, twitch, spotify, pix, pix_qrcode, instagram_embed, youtube_embed, digital_form, guest_list, sales_page, contract, agenda, bible, carousel, product_catalog, pdf, tiktok_embed, spotify_embed, linkedin_embed, pinterest_embed, location.

Para extrair um novo tipo: criar `types/<item_type>.ejs` com o bloco correspondente e em `profile.ejs` substituir o bloco por:

```ejs
<% } else if (item.item_type === '<item_type>') { %>
    <%- include('profile/items/types/<item_type>', { item }) %>
```
