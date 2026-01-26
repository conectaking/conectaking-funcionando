/**
 * Extrai o ID do vídeo do YouTube de diferentes formatos de URL
 * Suporta: watch?v=, youtu.be/, embed/, v/, shorts/, e apenas o ID
 * @param {string} input - URL do YouTube ou apenas o ID do vídeo
 * @returns {string|null} - ID do vídeo ou null
 */
function extractYouTubeVideoId(input) {
    if (!input || typeof input !== 'string') return null;
    
    // Se já é apenas um ID válido (11 caracteres alfanuméricos) — não confundir com channel ID (24 chars)
    const cleanId = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
        return cleanId;
    }
    
    // Padrões para extrair ID de URLs (vídeo/shorts/live por vídeo e link /live/VIDEO_ID)
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
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
 * Extrai o ID do canal do YouTube para embed de live por canal
 * Suporta: embed/live_stream?channel=, /channel/UC..., ?channel= e &channel=
 * Formato do channel ID: normalmente UC + 22 caracteres (24 no total)
 * @param {string} input - URL do YouTube com canal ou embed de live
 * @returns {string|null} - ID do canal ou null
 */
function extractYouTubeChannelId(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    // live_stream?channel=UC... ou /embed/live_stream?channel=UC...
    const m1 = s.match(/(?:live_stream\?|&)channel=([A-Za-z0-9_-]{24})/);
    if (m1 && m1[1]) return m1[1];
    // /channel/UC...
    const m2 = s.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/);
    if (m2 && m2[1]) return m2[1];
    // channel= em qualquer query string
    const m3 = s.match(/[?&]channel=(UC[A-Za-z0-9_-]{22})/);
    if (m3 && m3[1]) return m3[1];
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
 * Suporta: vídeo normal, Shorts, live por vídeo e live por canal (embed/live_stream?channel=).
 * @param {string} url - URL do YouTube em qualquer formato
 * @returns {string} - URL no formato de embed
 */
function convertYouTubeUrlToEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    const u = url.trim();
    if (!u) return '';

    // 1) Live por canal: embed permanente da live do canal
    const channelId = extractYouTubeChannelId(u);
    if (channelId) {
        return `https://www.youtube.com/embed/live_stream?channel=${channelId}`;
    }

    // 2) Vídeo normal, Shorts ou live com link de vídeo (video ID)
    const videoId = extractYouTubeVideoId(u);
    if (!videoId) return u;

    const cleanVideoId = String(videoId).split('&')[0].split('?')[0].split('#')[0];
    return `https://www.youtube.com/embed/${cleanVideoId}`;
}

/**
 * Constrói URL completa do embed do YouTube com parâmetros "clean"
 * Suporta vídeo, Shorts e live por canal.
 * @param {string} input - URL do YouTube ou apenas o ID do vídeo/canal
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
        controls = false,
        origin = null,
        useNoCookie = false
    } = options;

    const domain = useNoCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
    const params = new URLSearchParams();
    params.append('modestbranding', '1');
    params.append('rel', '0');
    params.append('controls', '1');
    params.append('fs', '0');
    params.append('disablekb', '1');
    params.append('iv_load_policy', '3');
    params.append('playsinline', '1');
    params.append('cc_load_policy', '0');
    params.append('enablejsapi', '1');
    if (origin) params.append('origin', origin);
    if (autoplay) params.append('autoplay', '1');
    if (mute) params.append('mute', '1');

    // Live por canal
    const channelId = extractYouTubeChannelId(input);
    if (channelId) {
        const base = `https://${domain}/embed/live_stream?channel=${channelId}`;
        return `${base}&${params.toString()}`;
    }

    // Vídeo / Shorts / live por vídeo
    let videoId = extractYouTubeVideoId(input) || sanitizeYouTubeId(input);
    if (!videoId) return input || '';
    videoId = sanitizeYouTubeId(videoId);
    if (!videoId) return '';

    const baseUrl = `https://${domain}/embed/${videoId}`;
    return `${baseUrl}?${params.toString()}`;
}

module.exports = {
    extractYouTubeVideoId,
    extractYouTubeChannelId,
    sanitizeYouTubeId,
    convertYouTubeUrlToEmbed,
    buildYouTubeEmbedUrl
};
