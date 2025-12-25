/**
 * CÓDIGO PRONTO PARA COPIAR E COLAR NO BACKEND
 * 
 * Este arquivo contém o código completo que você precisa adicionar ao seu backend
 * para corrigir o erro 153 do YouTube Embed.
 * 
 * INSTRUÇÕES:
 * 1. Copie as funções abaixo para um arquivo utils/youtube.js (ou onde preferir)
 * 2. Importe e use nas rotas que renderizam a página pública
 * 3. Atualize o template HTML conforme mostrado
 */

// ============================================
// ARQUIVO: utils/youtube.js
// ============================================

/**
 * Extrai o ID do vídeo do YouTube de diferentes formatos de URL
 * @param {string} url - URL do YouTube em qualquer formato
 * @returns {string|null} - ID do vídeo ou null se não encontrar
 */
function extractYouTubeVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    
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
 * @returns {string} - URL no formato de embed (youtube.com/embed/VIDEO_ID)
 */
function convertYouTubeUrlToEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        // Se não conseguir extrair o ID, retorna a URL original
        // (pode ser que já esteja no formato correto ou seja um link direto)
        return url;
    }
    
    // Remove parâmetros de timestamp e outros da URL
    const cleanVideoId = videoId.split('&')[0].split('?')[0];
    
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

module.exports = {
    extractYouTubeVideoId,
    convertYouTubeUrlToEmbed
};

// ============================================
// EXEMPLO 1: Rota que renderiza página pública
// ============================================

const { convertYouTubeUrlToEmbed } = require('./utils/youtube');

// Exemplo com Express.js
app.get('/:slug', async (req, res) => {
    try {
        // Buscar perfil do banco de dados
        const profile = await getProfileBySlug(req.params.slug);
        
        if (!profile) {
            return res.status(404).send('Perfil não encontrado');
        }
        
        // Processar itens: filtrar ativos e converter URLs do YouTube
        const items = profile.items
            .filter(item => item.is_active === true) // Apenas itens ativos
            .map(item => {
                // Se for YouTube embed, converter a URL
                if (item.item_type === 'youtube_embed' && item.destination_url) {
                    return {
                        ...item,
                        embed_url: convertYouTubeUrlToEmbed(item.destination_url)
                    };
                }
                return item;
            });
        
        // Renderizar template com dados processados
        res.render('profile', {
            profile: profile.details,
            items: items
        });
        
    } catch (error) {
        console.error('Erro ao renderizar perfil:', error);
        res.status(500).send('Erro ao carregar perfil');
    }
});

// ============================================
// EXEMPLO 2: API que retorna JSON
// ============================================

app.get('/api/public-profile/:slug', async (req, res) => {
    try {
        const profile = await getProfileBySlug(req.params.slug);
        
        if (!profile) {
            return res.status(404).json({ error: 'Perfil não encontrado' });
        }
        
        const items = profile.items
            .filter(item => item.is_active === true)
            .map(item => {
                if (item.item_type === 'youtube_embed' && item.destination_url) {
                    return {
                        ...item,
                        embed_url: convertYouTubeUrlToEmbed(item.destination_url)
                    };
                }
                return item;
            });
        
        res.json({
            profile: profile.details,
            items: items
        });
        
    } catch (error) {
        console.error('Erro na API:', error);
        res.status(500).json({ error: 'Erro ao carregar perfil' });
    }
});

// ============================================
// EXEMPLO 3: Função helper para renderizar item
// ============================================

function renderItemHTML(item) {
    if (item.item_type === 'youtube_embed') {
        // Converter URL para embed
        const embedUrl = convertYouTubeUrlToEmbed(item.destination_url || '');
        
        // Retornar HTML do iframe
        return `
            <div class="embed-container" style="width: 100%; margin: 16px 0; border-radius: 12px; overflow: hidden; background-color: rgba(0, 0, 0, 0.3);">
                <iframe 
                    src="${embedUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="width: 100%; aspect-ratio: 16/9; border: none; border-radius: 12px; display: block;"
                ></iframe>
            </div>
        `;
    }
    
    // Outros tipos de itens...
    return '';
}

// ============================================
// EXEMPLO 4: Template EJS
// ============================================

/*
<!-- profile.ejs -->
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
    <% } else if (item.item_type === 'link') { %>
        <a href="<%= item.destination_url %>" class="link-item">
            <%= item.title %>
        </a>
    <% } %>
<% }) %>
*/

// ============================================
// EXEMPLO 5: Template Handlebars
// ============================================

/*
{{#each items}}
    {{#if (eq item_type 'youtube_embed')}}
        <div class="embed-container">
            <iframe 
                src="{{embed_url destination_url}}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
            ></iframe>
        </div>
    {{/if}}
{{/each}}
*/

// ============================================
// EXEMPLO 6: React Component (se usar SSR)
// ============================================

/*
function YouTubeEmbed({ item }) {
    const embedUrl = convertYouTubeUrlToEmbed(item.destination_url);
    
    return (
        <div className="embed-container">
            <iframe 
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px' }}
            />
        </div>
    );
}
*/

// ============================================
// TESTES
// ============================================

// Teste das funções
console.log('Teste 1:', convertYouTubeUrlToEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
// Esperado: https://www.youtube.com/embed/dQw4w9WgXcQ

console.log('Teste 2:', convertYouTubeUrlToEmbed('https://youtu.be/dQw4w9WgXcQ'));
// Esperado: https://www.youtube.com/embed/dQw4w9WgXcQ

console.log('Teste 3:', convertYouTubeUrlToEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'));
// Esperado: https://www.youtube.com/embed/dQw4w9WgXcQ

console.log('Teste 4:', convertYouTubeUrlToEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ'));
// Esperado: https://www.youtube.com/embed/dQw4w9WgXcQ (já está correto)

