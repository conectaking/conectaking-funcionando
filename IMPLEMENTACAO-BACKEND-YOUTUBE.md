# Guia de Implementação - Correção YouTube Embed no Backend

## 📍 Onde Implementar

A correção deve ser feita no backend que renderiza a página pública em `tag.conectaking.com.br/[slug]`.

## 🔍 Localização do Código

Procure por arquivos que:
1. Renderizam a página pública da tag (rota `/[slug]` ou similar)
2. Processam itens do tipo `youtube_embed`
3. Geram HTML com iframes do YouTube

### Possíveis locais no código:
- Arquivo de rotas (ex: `routes/profile.js`, `routes/public.js`)
- Template engine (ex: `views/profile.ejs`, `templates/profile.html`)
- Controller que renderiza a página pública
- Função que processa itens antes de renderizar

## 🛠️ Implementação Passo a Passo

### Passo 1: Adicionar Funções de Conversão

Adicione estas funções em um arquivo de utilitários (ex: `utils/youtube.js` ou no início do arquivo de rotas):

#### Para Node.js/JavaScript:

```javascript
/**
 * Extrai o ID do vídeo do YouTube de diferentes formatos de URL
 * @param {string} url - URL do YouTube
 * @returns {string|null} - ID do vídeo ou null
 */
function extractYouTubeVideoId(url) {
    if (!url) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
        /youtu\.be\/([^?\n#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Converte URL do YouTube para formato de embed
 * @param {string} url - URL do YouTube em qualquer formato
 * @returns {string} - URL no formato de embed
 */
function convertYouTubeUrlToEmbed(url) {
    if (!url) return '';
    
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url; // Retorna a URL original se não conseguir extrair o ID
    
    // Remove parâmetros de timestamp e outros da URL
    const cleanVideoId = videoId.split('&')[0].split('?')[0];
    
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

// Exportar as funções
module.exports = {
    extractYouTubeVideoId,
    convertYouTubeUrlToEmbed
};
```

#### Para Python:

```python
import re

def extract_youtube_video_id(url):
    """
    Extrai o ID do vídeo do YouTube de diferentes formatos de URL
    """
    if not url:
        return None
    
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/)([^&\n?#]+)',
        r'youtube\.com/.*[?&]v=([^&\n?#]+)',
        r'youtu\.be/([^?\n#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match and match.group(1):
            return match.group(1)
    
    return None

def convert_youtube_url_to_embed(url):
    """
    Converte URL do YouTube para formato de embed
    """
    if not url:
        return ''
    
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return url  # Retorna a URL original se não conseguir extrair o ID
    
    # Remove parâmetros de timestamp e outros da URL
    clean_video_id = video_id.split('&')[0].split('?')[0]
    
    return f'https://www.youtube.com/embed/{clean_video_id}'
```

### Passo 2: Localizar Onde os Itens São Renderizados

Procure no código onde os itens são processados antes de renderizar. Procure por:
- `item.item_type === 'youtube_embed'`
- `item_type == 'youtube_embed'`
- Renderização de iframes
- Geração de HTML para itens

### Passo 3: Aplicar a Conversão

#### Exemplo 1: Node.js com Template Engine (EJS/Handlebars)

**ANTES:**
```javascript
// routes/public.js ou similar
app.get('/:slug', async (req, res) => {
    const profile = await getProfileBySlug(req.params.slug);
    const items = profile.items.filter(item => item.is_active);
    
    res.render('profile', { profile, items });
});
```

**DEPOIS:**
```javascript
const { convertYouTubeUrlToEmbed } = require('./utils/youtube');

app.get('/:slug', async (req, res) => {
    const profile = await getProfileBySlug(req.params.slug);
    const items = profile.items
        .filter(item => item.is_active)
        .map(item => {
            // Converter URL do YouTube para embed
            if (item.item_type === 'youtube_embed' && item.destination_url) {
                item.embed_url = convertYouTubeUrlToEmbed(item.destination_url);
            }
            return item;
        });
    
    res.render('profile', { profile, items });
});
```

**No template (profile.ejs ou similar):**
```ejs
<% items.forEach(item => { %>
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
    <% } else { %>
        <!-- outros tipos de itens -->
    <% } %>
<% }) %>
```

#### Exemplo 2: Node.js Renderizando HTML Diretamente

**ANTES:**
```javascript
function renderItem(item) {
    if (item.item_type === 'youtube_embed') {
        return `
            <div class="embed-container">
                <iframe src="${item.destination_url}" frameborder="0" allowfullscreen></iframe>
            </div>
        `;
    }
    // outros tipos...
}
```

**DEPOIS:**
```javascript
const { convertYouTubeUrlToEmbed } = require('./utils/youtube');

function renderItem(item) {
    if (item.item_type === 'youtube_embed') {
        const embedUrl = convertYouTubeUrlToEmbed(item.destination_url);
        return `
            <div class="embed-container">
                <iframe 
                    src="${embedUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
                ></iframe>
            </div>
        `;
    }
    // outros tipos...
}
```

#### Exemplo 3: Python com Flask/Jinja2

**ANTES:**
```python
@app.route('/<slug>')
def public_profile(slug):
    profile = get_profile_by_slug(slug)
    items = [item for item in profile.items if item.is_active]
    return render_template('profile.html', profile=profile, items=items)
```

**DEPOIS:**
```python
from utils.youtube import convert_youtube_url_to_embed

@app.route('/<slug>')
def public_profile(slug):
    profile = get_profile_by_slug(slug)
    items = []
    for item in profile.items:
        if item.is_active:
            # Converter URL do YouTube para embed
            if item.item_type == 'youtube_embed' and item.destination_url:
                item.embed_url = convert_youtube_url_to_embed(item.destination_url)
            items.append(item)
    return render_template('profile.html', profile=profile, items=items)
```

**No template (profile.html):**
```html
{% for item in items %}
    {% if item.item_type == 'youtube_embed' %}
        <div class="embed-container">
            <iframe 
                src="{{ item.embed_url or item.destination_url }}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
            ></iframe>
        </div>
    {% else %}
        <!-- outros tipos de itens -->
    {% endif %}
{% endfor %}
```

#### Exemplo 4: API que Retorna JSON (Frontend Renderiza)

Se o backend apenas retorna JSON e o frontend renderiza:

**ANTES:**
```javascript
app.get('/api/public-profile/:slug', async (req, res) => {
    const profile = await getProfileBySlug(req.params.slug);
    const items = profile.items.filter(item => item.is_active);
    res.json({ profile, items });
});
```

**DEPOIS:**
```javascript
const { convertYouTubeUrlToEmbed } = require('./utils/youtube');

app.get('/api/public-profile/:slug', async (req, res) => {
    const profile = await getProfileBySlug(req.params.slug);
    const items = profile.items
        .filter(item => item.is_active)
        .map(item => {
            // Converter URL do YouTube para embed
            if (item.item_type === 'youtube_embed' && item.destination_url) {
                return {
                    ...item,
                    embed_url: convertYouTubeUrlToEmbed(item.destination_url)
                };
            }
            return item;
        });
    res.json({ profile, items });
});
```

### Passo 4: Adicionar CSS (se necessário)

Se o CSS não estiver no frontend, adicione no template:

```css
.embed-container {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.3);
    margin: 16px 0;
}

.embed-container iframe {
    width: 100%;
    aspect-ratio: 16/9;
    border: none;
    border-radius: 12px;
    display: block;
}
```

## ✅ Checklist de Implementação

- [ ] Funções de conversão adicionadas ao projeto
- [ ] Funções importadas/requeridas onde necessário
- [ ] Conversão aplicada antes de renderizar itens `youtube_embed`
- [ ] Iframe renderizado com atributos corretos:
  - [ ] `src` com URL convertida
  - [ ] `frameborder="0"`
  - [ ] `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"`
  - [ ] `allowfullscreen`
  - [ ] Estilo responsivo com `aspect-ratio: 16/9`
- [ ] Testado com diferentes formatos de URL:
  - [ ] `https://www.youtube.com/watch?v=VIDEO_ID`
  - [ ] `https://youtu.be/VIDEO_ID`
  - [ ] `https://www.youtube.com/watch?v=VIDEO_ID&t=30s`
  - [ ] `https://www.youtube.com/embed/VIDEO_ID` (já no formato correto)

## 🧪 Teste

Após implementar, teste com estas URLs:

1. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. `https://youtu.be/dQw4w9WgXcQ`
3. `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s`

Todas devem ser convertidas para: `https://www.youtube.com/embed/dQw4w9WgXcQ`

## 📝 Notas Importantes

1. **Validação**: Sempre verifique se `item.destination_url` existe antes de converter
2. **Fallback**: Se a conversão falhar, use a URL original (pode ser um link direto)
3. **Segurança**: Use escape/escape HTML ao renderizar URLs no HTML para prevenir XSS
4. **Performance**: A conversão é rápida, mas considere cachear se necessário

## 🆘 Problemas Comuns

### Erro 153 ainda aparece
- Verifique se a URL está sendo convertida corretamente
- Confirme que o iframe está usando `src` com a URL convertida
- Verifique se o vídeo permite incorporação (configurações do YouTube)

### Vídeo não carrega
- Verifique se o ID do vídeo foi extraído corretamente
- Confirme que o vídeo está público ou permite incorporação
- Verifique o console do navegador para erros

### URL não é convertida
- Verifique se a função está sendo chamada
- Confirme que `item.item_type === 'youtube_embed'`
- Verifique se `item.destination_url` não está vazio

## 📞 Suporte

Se precisar de ajuda, verifique:
1. Logs do servidor para erros
2. Console do navegador para erros JavaScript
3. Network tab para verificar a URL do iframe sendo carregada

