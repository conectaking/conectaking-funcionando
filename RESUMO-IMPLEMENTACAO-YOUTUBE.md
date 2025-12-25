# 🚀 Resumo Rápido - Implementação YouTube Embed

## ⚡ Implementação em 3 Passos

### 1️⃣ Adicionar Funções de Conversão

Crie um arquivo `utils/youtube.js` (ou adicione no arquivo de rotas):

```javascript
function extractYouTubeVideoId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
        /youtu\.be\/([^?\n#]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

function convertYouTubeUrlToEmbed(url) {
    if (!url) return '';
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url;
    const cleanVideoId = videoId.split('&')[0].split('?')[0];
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

module.exports = { extractYouTubeVideoId, convertYouTubeUrlToEmbed };
```

### 2️⃣ Importar e Usar na Rota Pública

```javascript
const { convertYouTubeUrlToEmbed } = require('./utils/youtube');

// Na rota que renderiza a página pública
app.get('/:slug', async (req, res) => {
    const profile = await getProfileBySlug(req.params.slug);
    const items = profile.items
        .filter(item => item.is_active)
        .map(item => {
            if (item.item_type === 'youtube_embed' && item.destination_url) {
                item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
            }
            return item;
        });
    res.render('profile', { profile, items });
});
```

### 3️⃣ Atualizar o Template HTML

```html
<% if (item.item_type === 'youtube_embed') { %>
    <div class="embed-container">
        <iframe 
            src="<%= item.embed_url || item.destination_url %>" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
        ></iframe>
    </div>
<% } %>
```

## 📋 Onde Procurar no Código do Backend

Procure por:
- ✅ Arquivo de rotas: `routes/public.js`, `routes/profile.js`, `routes/index.js`
- ✅ Controller: `controllers/PublicController.js`, `controllers/ProfileController.js`
- ✅ Template: `views/profile.ejs`, `templates/profile.html`
- ✅ Função que renderiza: `renderProfile()`, `getPublicProfile()`, `showProfile()`

## 🔍 O Que Procurar

Procure por código que:
1. Renderiza itens: `item.item_type === 'youtube_embed'`
2. Cria iframes: `<iframe src="..."`
3. Processa `destination_url` de itens

## ✅ Teste Rápido

Teste com estas URLs:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → deve virar `https://www.youtube.com/embed/dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ` → deve virar `https://www.youtube.com/embed/dQw4w9WgXcQ`

## 📖 Documentação Completa

Para mais detalhes, veja: `IMPLEMENTACAO-BACKEND-YOUTUBE.md`

