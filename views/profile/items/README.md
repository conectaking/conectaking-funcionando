# Partials dos itens do cartão (profile)

Cada tipo de item do cartão pode ter um partial em `types/<item_type>.ejs`.
A variável disponível em todos os partials é **`item`**.

## Partials já criados

| item_type      | Arquivo              | Descrição           |
|----------------|----------------------|---------------------|
| link           | types/link.ejs       | Link personalizado  |
| banner         | types/banner.ejs     | Banner (imagem)     |
| whatsapp       | types/whatsapp.ejs   | WhatsApp            |
| telegram       | types/telegram.ejs   | Telegram            |
| email          | types/email.ejs      | Email               |
| instagram      | types/instagram.ejs  | Instagram (link)    |
| facebook       | types/facebook.ejs   | Facebook            |
| tiktok         | types/tiktok.ejs     | TikTok              |
| twitter        | types/twitter.ejs    | X (Twitter)         |
| youtube        | types/youtube.ejs    | YouTube (link)      |
| linkedin       | types/linkedin.ejs   | LinkedIn            |
| portfolio      | types/portfolio.ejs  | Portfólio           |
| pinterest      | types/pinterest.ejs  | Pinterest           |
| reddit         | types/reddit.ejs     | Reddit              |
| twitch         | types/twitch.ejs     | Twitch              |
| spotify        | types/spotify.ejs    | Spotify             |
| pix_qrcode     | types/pix_qrcode.ejs | PIX QR Code (botão) |

## Tipos restantes (podem ser extraídos do profile.ejs)

Conforme `docs/LISTA-COMPLETA-SEPARACAO.md`: pix, instagram_embed, youtube_embed, digital_form, guest_list, sales_page, contract, agenda, bible, carousel, product_catalog, pdf, tiktok_embed, spotify_embed, linkedin_embed, pinterest_embed, location.

Para extrair um novo tipo: criar `types/<item_type>.ejs` com o bloco correspondente e em `profile.ejs` substituir o bloco por:

```ejs
<% } else if (item.item_type === '<item_type>') { %>
    <%- include('profile/items/types/<item_type>', { item }) %>
```
