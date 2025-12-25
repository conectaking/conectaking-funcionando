# Correção do YouTube Embed - Erro 153

## Problema Identificado

O YouTube incorporado está apresentando o erro 153, que geralmente ocorre quando:
1. A URL do vídeo não está no formato correto para embed
2. A URL não foi convertida de `youtube.com/watch?v=...` para `youtube.com/embed/...`

## Solução Implementada no Frontend

### Funções Adicionadas em `dashboard.js`

1. **`extractYouTubeVideoId(url)`**: Extrai o ID do vídeo do YouTube de diferentes formatos de URL:
   - `youtube.com/watch?v=VIDEO_ID`
   - `youtu.be/VIDEO_ID`
   - `youtube.com/embed/VIDEO_ID`
   - `youtube.com/v/VIDEO_ID`

2. **`convertYouTubeUrlToEmbed(url)`**: Converte qualquer URL do YouTube para o formato de embed correto:
   - Entrada: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Saída: `https://www.youtube.com/embed/dQw4w9WgXcQ`

### Correção no Preview

O preview do dashboard agora renderiza um iframe real do YouTube quando há uma URL válida, em vez de apenas um placeholder.

## Solução Necessária no Backend

A página pública (tag.conectaking.com.br/[slug]) é renderizada pelo backend. Para corrigir o erro 153, o backend DEVE:

### 1. Converter URLs do YouTube para formato de embed

Ao renderizar itens do tipo `youtube_embed`, o backend deve converter a URL armazenada em `destination_url` para o formato de embed antes de criar o iframe.

### Exemplo de Implementação (Node.js/JavaScript)

```javascript
// Função para extrair o ID do vídeo do YouTube
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

// Função para converter URL do YouTube para formato de embed
function convertYouTubeUrlToEmbed(url) {
    if (!url) return '';
    
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url; // Retorna a URL original se não conseguir extrair o ID
    
    // Remove parâmetros de timestamp e outros da URL
    const cleanVideoId = videoId.split('&')[0].split('?')[0];
    
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

// Ao renderizar o item youtube_embed na página pública:
if (item.item_type === 'youtube_embed') {
    const embedUrl = convertYouTubeUrlToEmbed(item.destination_url);
    // Renderizar iframe com embedUrl
    html = `<iframe 
        src="${embedUrl}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
    ></iframe>`;
}
```

### Exemplo de Implementação (Python)

```python
import re

def extract_youtube_video_id(url):
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
    if not url:
        return ''
    
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return url  # Retorna a URL original se não conseguir extrair o ID
    
    # Remove parâmetros de timestamp e outros da URL
    clean_video_id = video_id.split('&')[0].split('?')[0]
    
    return f'https://www.youtube.com/embed/{clean_video_id}'
```

### 2. Renderizar o iframe corretamente

O iframe do YouTube deve incluir os seguintes atributos:
- `src`: URL no formato `https://www.youtube.com/embed/VIDEO_ID`
- `frameborder="0"`
- `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"`
- `allowfullscreen`
- Estilo responsivo com `aspect-ratio: 16/9`

### 3. Validação

Antes de renderizar, verificar:
- Se a URL é válida
- Se o ID do vídeo foi extraído com sucesso
- Se o vídeo permite incorporação (alguns vídeos podem ter restrições)

## Teste

Para testar, use diferentes formatos de URL do YouTube:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s`
- `https://www.youtube.com/embed/dQw4w9WgXcQ` (já está no formato correto)

Todos devem ser convertidos para: `https://www.youtube.com/embed/dQw4w9WgXcQ`

## Notas Adicionais

- O erro 153 também pode ocorrer se o vídeo não permitir incorporação (configurações de privacidade)
- Certifique-se de que o vídeo está configurado como "Público" ou que a opção "Permitir incorporação" está ativada no YouTube Studio
- Alguns vídeos podem ter restrições regionais que impedem a incorporação

