/**
 * Extrai o ID do vídeo do YouTube de diferentes formatos de URL
 * Suporta: watch?v=, youtu.be/, embed/, v/, shorts/, e apenas o ID
 * @param {string} input - URL do YouTube ou apenas o ID do vídeo
 * @returns {string|null} - ID do vídeo ou null
 */
function extractYouTubeVideoId(input) {
    if (!input || typeof input !== 'string') return null;
    
    // Se já é apenas um ID válido (11 caracteres alfanuméricos)
    const cleanId = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
        return cleanId;
    }
    
    // Padrões para extrair ID de URLs
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Sanitiza o ID do vídeo do YouTube (apenas caracteres permitidos)
 * @param {string} videoId - ID do vídeo
 * @returns {string|null} - ID sanitizado ou null se inválido
 */
function sanitizeYouTubeId(videoId) {
    if (!videoId || typeof videoId !== 'string') return null;
    
    // Remove caracteres não permitidos, mantém apenas [a-zA-Z0-9_-]
    const sanitized = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // YouTube IDs têm exatamente 11 caracteres
    if (sanitized.length === 11) {
        return sanitized;
    }
    
    return null;
}

/**
 * Converte URL do YouTube para formato de embed
 * @param {string} url - URL do YouTube em qualquer formato
 * @returns {string} - URL no formato de embed
 */
function convertYouTubeUrlToEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url; // Retorna a URL original se não conseguir extrair o ID
    
    // Remove parâmetros de timestamp e outros da URL
    const cleanVideoId = videoId.split('&')[0].split('?')[0].split('#')[0];
    
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

/**
 * Constrói URL completa do embed do YouTube com parâmetros "clean"
 * Usa youtube-nocookie.com para privacidade e minimiza UI do YouTube
 * @param {string} input - URL do YouTube ou apenas o ID do vídeo
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.autoplay - Auto-reproduzir vídeo (padrão: false)
 * @param {boolean} options.mute - Vídeo mudo (padrão: false)
 * @param {boolean} options.controls - Mostrar controles (padrão: false para modo ultra clean)
 * @param {string} options.origin - Origin para enablejsapi (padrão: null)
 * @param {boolean} options.useNoCookie - Usar youtube-nocookie.com (padrão: true)
 * @returns {string} - URL completa com parâmetros
 */
function buildYouTubeEmbedUrl(input, options = {}) {
    const {
        autoplay = false,
        mute = false,
        controls = false, // Modo ultra clean por padrão
        origin = null,
        useNoCookie = true // Preferir youtube-nocookie.com para privacidade
    } = options;
    
    // Extrair e sanitizar ID do vídeo
    let videoId = extractYouTubeVideoId(input);
    if (!videoId) {
        // Tentar sanitizar se for apenas um ID
        videoId = sanitizeYouTubeId(input);
    }
    
    if (!videoId) {
        // Se não conseguiu extrair, retorna URL original ou vazia
        return input || '';
    }
    
    // Sanitizar novamente para garantir segurança
    videoId = sanitizeYouTubeId(videoId);
    if (!videoId) {
        return '';
    }
    
    // Usar youtube-nocookie.com para privacidade (não rastreia cookies)
    const domain = useNoCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
    const baseUrl = `https://${domain}/embed/${videoId}`;
    
    // Construir parâmetros conforme especificação
    const params = new URLSearchParams();
    
    // Parâmetros para minimizar UI do YouTube
    params.append('modestbranding', '1'); // Reduz branding do YouTube
    params.append('rel', '0'); // Não mostrar vídeos relacionados
    params.append('controls', controls ? '1' : '0'); // Controles (0 = ultra clean)
    params.append('fs', '0'); // Desabilitar botão fullscreen
    params.append('disablekb', '1'); // Desabilitar controles de teclado
    params.append('iv_load_policy', '3'); // Desabilitar anotações
    params.append('playsinline', '1'); // Reproduzir inline no mobile
    params.append('cc_load_policy', '0'); // Não carregar legendas automaticamente
    
    // Parâmetros de reprodução
    if (autoplay) params.append('autoplay', '1');
    if (mute) params.append('mute', '1');
    
    // Parâmetros de API (necessário para algumas funcionalidades)
    params.append('enablejsapi', '1');
    if (origin) {
        params.append('origin', origin);
    }
    
    // Construir URL final
    return `${baseUrl}?${params.toString()}`;
}

module.exports = { 
    extractYouTubeVideoId, 
    sanitizeYouTubeId,
    convertYouTubeUrlToEmbed,
    buildYouTubeEmbedUrl
};
